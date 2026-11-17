import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Цель подписания: документ или пакет. */
export interface InitBatchSignInput {
  documentId?: bigint;
  packageId?: bigint;
  signerUserId: bigint;
  signerType?: 'USER' | 'UNIVERSITY' | 'SYSTEM';
  signatureFormat?: 'CADES' | 'XADES' | 'PADES';
}

@Injectable()
export class SignatureService {
  constructor(private readonly prisma: PrismaService) {}

  private sha256(input: string): string {
    return createHash('sha256').update(input, 'utf8').digest('hex');
  }

  /** Создаёт DocumentSignature со статусом PENDING (запрос на подписание). */
  async initBatchSign(input: InitBatchSignInput): Promise<{ id: bigint; publicId: string }> {
    if (input.documentId == null && input.packageId == null) {
      throw new BadRequestException('Укажите documentId или packageId');
    }

    const signature = await this.prisma.documentSignature.create({
      data: {
        document_id: input.documentId ?? null,
        package_id: input.packageId ?? null,
        signer_user_id: input.signerUserId,
        signer_type: input.signerType ?? 'USER',
        signature_format: input.signatureFormat ?? 'CADES',
        status: 'PENDING',
      },
    });

    return { id: signature.id, publicId: signature.public_id };
  }

  /** Завершает подписание: статус SIGNED, подпись + сертификат, звено hash-chain. */
  async completeBatchSign(
    signatureId: bigint,
    input: { signatureValue: string; certificateInfo?: Prisma.InputJsonValue },
  ): Promise<unknown> {
    const signature = await this.prisma.documentSignature.findUnique({ where: { id: signatureId } });
    if (!signature) throw new NotFoundException('Подпись не найдена');
    if (signature.status === 'SIGNED') throw new BadRequestException('Подпись уже завершена');

    const signedAt = new Date();
    const signatureChecksum = this.sha256(input.signatureValue);

    const updated = await this.prisma.documentSignature.update({
      where: { id: signatureId },
      data: {
        status: 'SIGNED',
        signature_value: input.signatureValue,
        certificate_info: input.certificateInfo ?? {},
        signature_checksum: signatureChecksum,
        signed_at: signedAt,
      },
    });

    await this.appendHashChain(signature.document_id, signature.package_id, {
      signatureId: String(signature.id),
      publicId: signature.public_id,
      signatureValue: input.signatureValue,
      signedAt: signedAt.toISOString(),
    });

    return updated;
  }

  /**
   * Добавляет звено hash-chain: entry_hash = sha256(prev_hash + payload).
   * Цепочка ведётся по документу или пакету (порядок — поле position).
   */
  private async appendHashChain(
    documentId: bigint | null,
    packageId: bigint | null,
    payload: Record<string, string>,
  ): Promise<void> {
    const prev = await this.prisma.hashChain.findFirst({
      where: {
        ...(documentId != null ? { document_id: documentId } : {}),
        ...(packageId != null ? { package_id: packageId } : {}),
      },
      orderBy: { position: 'desc' },
    });

    const prevHash = prev?.entry_hash ?? null;
    const payloadJson = JSON.stringify(payload);
    const entryHash = this.sha256((prevHash ?? '') + payloadJson);

    await this.prisma.hashChain.create({
      data: {
        entry_hash: entryHash,
        prev_hash: prevHash,
        document_id: documentId,
        package_id: packageId,
        position: (prev?.position ?? 0) + 1,
        algorithm: 'SHA_256',
        payload_ref: `signature:${payload.signatureId}`,
      },
    });
  }

  /** Проверка подписи: заглушка OCSP/CRL (TODO — реальная верификация через НУЦ). */
  async verifySignature(signatureId: bigint): Promise<{ valid: boolean; ocspStatus: string; message: string }> {
    const signature = await this.prisma.documentSignature.findUnique({ where: { id: signatureId } });
    if (!signature) throw new NotFoundException('Подпись не найдена');
    // TODO: валидация CAdES/XAdES/PAdES и статуса сертификата через НУЦ (OCSP/CRL).
    return {
      valid: signature.status === 'SIGNED',
      ocspStatus: 'GOOD',
      message: 'Заглушка OCSP: проверка отзыва сертификата не выполнялась',
    };
  }
}
