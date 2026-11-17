import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SignatureService } from './signature.service';
import type { CreatePackageDto } from './dto/create-package.dto';

/** Строковые литералы enum DocumentType (без импорта Prisma-типов). */
export type DocumentTypeValue =
  | 'APPLICATION'
  | 'STATEMENT'
  | 'CONTRACT'
  | 'LEASE_CONTRACT'
  | 'HANDOVER_ACT'
  | 'CERTIFICATE'
  | 'TRANSCRIPT'
  | 'ORDER'
  | 'CERTIFICATE_OF_STUDY'
  | 'OTHER';

/** Входные данные создания документа (метаданные + SHA-256). */
export interface CreateDocumentInput {
  ownerUserId: bigint;
  docType: DocumentTypeValue;
  title: string;
  description?: string;
  mimeType?: string;
  storageBucket?: string;
  storageKey?: string;
  originalFilename?: string;
  metadata?: Prisma.InputJsonValue;
}

/** Результат генерации пакета заселения. */
export interface MoveInPackageResult {
  packageId: bigint;
  leaseContractDocumentId: bigint;
  rulesDocumentId: bigint;
  handoverActDocumentId: bigint;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signatures: SignatureService,
  ) {}

  private sha256(input: string): string {
    return createHash('sha256').update(input, 'utf8').digest('hex');
  }

  /** Резолвит числовой id пользователя по keycloak subject (устанавливается JwtAuthGuard). */
  private async resolveUserId(sub: string): Promise<bigint> {
    const user = await this.prisma.user.findUnique({ where: { keycloak_subject: sub } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user.id;
  }

  /** Создаёт документ (статус DRAFT) с вычислением SHA-256 канонического представления. */
  async createDocument(input: CreateDocumentInput): Promise<{ id: bigint; publicId: string }> {
    const storageBucket = input.storageBucket ?? 'student-docs';
    const storageKey = input.storageKey ?? `drafts/${String(input.ownerUserId)}/${randomUUID()}.pdf`;
    const storageChecksum = this.sha256(
      JSON.stringify({
        ownerUserId: String(input.ownerUserId),
        docType: input.docType,
        title: input.title,
        storageKey,
      }),
    );

    const document = await this.prisma.document.create({
      data: {
        owner_user_id: input.ownerUserId,
        doc_type: input.docType,
        status: 'DRAFT',
        title: input.title,
        description: input.description,
        mime_type: input.mimeType ?? 'application/pdf',
        storage_bucket: storageBucket,
        storage_key: storageKey,
        storage_checksum: storageChecksum,
        original_filename: input.originalFilename,
        metadata: input.metadata ?? {},
      },
    });

    return { id: document.id, publicId: document.public_id };
  }

  /**
   * Генерирует пакет заселения в одной транзакции:
   * 3 документа (DRAFT: договор найма + правила + акт приёма-передачи)
   * + DocumentPackage + DocumentPackageItem. Возвращает id для связывания с RoomAllocation.
   */
  async generateMoveInPackage(
    ownerUserId: bigint,
    ctx: { allocationId: bigint; roomNumber?: string },
  ): Promise<MoveInPackageResult> {
    const base = `move-in/${String(ctx.allocationId)}`;

    const specs: Array<{ type: DocumentTypeValue; title: string; storageKey: string }> = [
      { type: 'LEASE_CONTRACT', title: 'Договор найма жилого помещения', storageKey: `${base}/lease-contract.pdf` },
      { type: 'OTHER', title: 'Правила проживания в общежитии', storageKey: `${base}/residence-rules.pdf` },
      { type: 'HANDOVER_ACT', title: 'Акт приёма-передачи жилого помещения', storageKey: `${base}/handover-act.pdf` },
    ];

    return this.prisma.$transaction(async (tx) => {
      const documents: Array<{ id: bigint }> = [];
      for (const spec of specs) {
        const doc = await tx.document.create({
          data: {
            owner_user_id: ownerUserId,
            doc_type: spec.type,
            status: 'DRAFT',
            title: spec.title,
            mime_type: 'application/pdf',
            storage_bucket: 'student-docs',
            storage_key: spec.storageKey,
            storage_checksum: this.sha256(
              JSON.stringify({ title: spec.title, storageKey: spec.storageKey, allocationId: String(ctx.allocationId) }),
            ),
            metadata: { allocationId: String(ctx.allocationId), roomNumber: ctx.roomNumber ?? null },
          },
        });
        documents.push(doc);
      }

      const pkg = await tx.documentPackage.create({
        data: {
          title: `Пакет заселения (заявка №${String(ctx.allocationId)})`,
          description: 'Договор найма, правила проживания, акт приёма-передачи',
          status: 'DRAFT',
          context: { allocationId: String(ctx.allocationId) },
        },
      });

      await tx.documentPackageItem.createMany({
        data: documents.map((doc, index) => ({
          package_id: pkg.id,
          document_id: doc.id,
          position: index + 1,
        })),
      });

      return {
        packageId: pkg.id,
        leaseContractDocumentId: documents[0].id,
        rulesDocumentId: documents[1].id,
        handoverActDocumentId: documents[2].id,
      };
    });
  }

  /** Список документов текущего пользователя. */
  async listUserDocuments(sub: string): Promise<unknown> {
    const userId = await this.resolveUserId(sub);
    return this.prisma.document.findMany({
      where: { owner_user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  /** Метаданные документа по числовому id (контроль доступа — TODO через RBAC). */
  async getDocument(documentId: bigint): Promise<unknown> {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Документ не найден');
    return document;
  }

  /** Заглушка выдачи presigned URL (реальная реализация — через MinIO SDK). */
  async presign(documentId: bigint): Promise<{ url: string; expiresIn: number; method: string }> {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Документ не найден');
    // TODO: подписать временную ссылку через MinIO STS / presigned GetObject.
    return {
      url: `https://minio.local/${document.storage_bucket}/${document.storage_key}?X-Amz-Signature=STUB&X-Amz-Expires=900`,
      expiresIn: 900,
      method: 'GET',
    };
  }

  /** Создание пакета из существующих документов (для пакетного подписания). */
  async createPackage(sub: string, dto: CreatePackageDto): Promise<unknown> {
    const userId = await this.resolveUserId(sub);

    return this.prisma.$transaction(async (tx) => {
      const pkg = await tx.documentPackage.create({
        data: {
          title: dto.title,
          description: dto.description,
          status: 'DRAFT',
          context: { createdBy: String(userId) },
        },
      });

      if (dto.documentIds && dto.documentIds.length > 0) {
        await tx.documentPackageItem.createMany({
          data: dto.documentIds.map((docId, index) => ({
            package_id: pkg.id,
            document_id: BigInt(docId),
            position: index + 1,
          })),
        });
      }

      return tx.documentPackage.findUniqueOrThrow({
        where: { id: pkg.id },
        include: { document_package_items: { include: { document: true }, orderBy: { position: 'asc' } } },
      });
    });
  }

  /** Список всех пакетов (область видимости — TODO). */
  async listPackages(): Promise<unknown> {
    return this.prisma.documentPackage.findMany({
      orderBy: { created_at: 'desc' },
      include: { document_package_items: true },
    });
  }

  /** Пакет по id со вложениями. */
  async getPackage(packageId: bigint): Promise<unknown> {
    const pkg = await this.prisma.documentPackage.findUnique({
      where: { id: packageId },
      include: { document_package_items: { include: { document: true }, orderBy: { position: 'asc' } } },
    });
    if (!pkg) throw new NotFoundException('Пакет документов не найден');
    return pkg;
  }

  /** Запрос на пакетное подписание (создаёт DocumentSignature PENDING). */
  async signPackage(sub: string, packageId: bigint): Promise<unknown> {
    const userId = await this.resolveUserId(sub);
    const pkg = await this.prisma.documentPackage.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('Пакет документов не найден');
    return this.signatures.initBatchSign({ packageId, signerUserId: userId });
  }
}
