import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Certificate, Payment, PaymentInvoice, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { AuthUser } from '../../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OutboxService } from '../../integration-hub/services/outbox.service';
import { PayGatewayService } from '../../integration-hub/services/pay-gateway.service';
import { CreateCertificateDto } from '../dto/create-certificate.dto';
import { PaymentCallbackDto } from '../dto/payment-callback.dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Сводка баланса по счетам и платежам. */
export interface BalanceSummary {
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  currency: string;
}

/** Дескриптор скачивания справки (в проде — подписанный URL из MinIO). */
export interface CertificateDownloadDescriptor {
  certificateId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  storageBucket: string;
  storageKey: string;
  signed: boolean;
}

/**
 * Доменный сервис университетских услуг (схема svc):
 * справки (серверная ЭЦП вуза — заглушка) и счета/платежи через платёжный шлюз (IH).
 */
@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly payGateway: PayGatewayService,
    private readonly outbox: OutboxService,
  ) {}

  // ---------------------------------------------------------------------------
  // Справки
  // ---------------------------------------------------------------------------

  /** Список справок текущего пользователя. */
  async listCertificates(user: AuthUser): Promise<Certificate[]> {
    const userId = await this.resolveUser(user);
    return this.prisma.certificate.findMany({
      where: { user_id: userId },
      orderBy: { requested_at: 'desc' },
      include: { document: true },
    });
  }

  /** Создать справку: Certificate REQUESTED + Document DRAFT (ЭЦП вуза — заглушка). */
  async createCertificate(user: AuthUser, dto: CreateCertificateDto): Promise<Certificate> {
    const userId = await this.resolveUser(user);

    // 1. Документ DRAFT: в проде бинарь в MinIO, здесь — метаданные + заглушка storage.
    const document = await this.prisma.document.create({
      data: {
        owner_user_id: userId,
        doc_type: 'CERTIFICATE',
        status: 'DRAFT',
        title: this.certificateTitle(dto.type),
        description: dto.purpose,
        mime_type: 'application/pdf',
        storage_bucket: this.config.get<string>('DOC_STORAGE_BUCKET', 'university-documents'),
        storage_key: `certificates/${dto.type.toLowerCase()}/${randomUUID()}.pdf`,
        storage_checksum: '0'.repeat(64), // заглушка SHA-256
        metadata: {
          certificateType: dto.type,
          generated: true,
          // Серверная (вузовская) ЭЦП — заглушка; в проде CAdES через NCALayer/HSM.
          universityEcs: 'stub',
        },
      },
    });

    // 2. Заявка Certificate REQUESTED.
    const certificate = await this.prisma.certificate.create({
      data: {
        user_id: userId,
        cert_type: dto.type,
        status: 'REQUESTED',
        document_id: document.id,
        purpose: dto.purpose,
      },
      include: { document: true },
    });

    // 3. Outbox-событие (в той же бизнес-операции).
    await this.outbox.publish('certificate.requested', 'certificate', certificate.public_id, {
      certificateType: dto.type,
      userId: userId.toString(),
    });

    return certificate;
  }

  /** Получить справку по public_id. */
  async getCertificate(
    user: AuthUser,
    id: string,
  ): Promise<Prisma.CertificateGetPayload<{ include: { document: true } }>> {
    const userId = await this.resolveUser(user);
    const certificate = await this.prisma.certificate.findFirst({
      where: { public_id: id, user_id: userId },
      include: { document: true },
    });
    if (!certificate) {
      throw new NotFoundException('Справка не найдена');
    }
    return certificate;
  }

  /** Скачать справку (заглушка: дескриптор, в проде — подписанный URL MinIO). */
  async downloadCertificate(user: AuthUser, id: string): Promise<CertificateDownloadDescriptor> {
    const certificate = await this.getCertificate(user, id);
    if (!certificate.document) {
      throw new NotFoundException('Документ справки не найден');
    }
    return {
      certificateId: certificate.public_id,
      documentId: certificate.document.public_id,
      fileName: `${certificate.document.title}.pdf`,
      mimeType: certificate.document.mime_type,
      storageBucket: certificate.document.storage_bucket,
      storageKey: certificate.document.storage_key,
      signed: certificate.status === 'ISSUED',
    };
  }

  // ---------------------------------------------------------------------------
  // Счета и платежи
  // ---------------------------------------------------------------------------

  /** Список счетов пользователя + сводный баланс. */
  async listInvoices(user: AuthUser): Promise<{ invoices: PaymentInvoice[]; balance: BalanceSummary }> {
    const userId = await this.resolveUser(user);
    const invoices = await this.prisma.paymentInvoice.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    const balance = await this.calculateBalance(userId);
    return { invoices, balance };
  }

  /** Получить счёт по public_id (с платежами). */
  async getInvoice(user: AuthUser, id: string): Promise<PaymentInvoice> {
    const userId = await this.resolveUser(user);
    const invoice = await this.prisma.paymentInvoice.findFirst({
      where: { public_id: id, user_id: userId },
      include: { payments: true },
    });
    if (!invoice) {
      throw new NotFoundException('Счёт не найден');
    }
    return invoice;
  }

  /** Оплатить счёт: создать Payment PENDING через платёжный шлюз (заглушка). */
  async payInvoice(user: AuthUser, id: string): Promise<Payment> {
    const userId = await this.resolveUser(user);
    const invoice = await this.prisma.paymentInvoice.findFirst({ where: { public_id: id } });
    if (!invoice) {
      throw new NotFoundException('Счёт не найден');
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Счёт уже оплачен');
    }

    // Внешний платёжный шлюз (заглушка в Integration Hub).
    const gateway = await this.payGateway.createPayment({
      orderId: invoice.invoice_number,
      amountKzt: this.toNumber(invoice.amount),
      currency: invoice.currency,
      description: invoice.title,
    });

    const payment = await this.prisma.payment.create({
      data: {
        invoice_id: invoice.id,
        user_id: userId,
        amount: invoice.amount,
        currency: invoice.currency,
        status: 'PENDING',
        method: 'CARD',
        provider: 'PAY_GATEWAY',
        provider_payment_id: gateway.paymentId,
        provider_response: gateway as unknown as Prisma.InputJsonValue,
        idempotency_key: randomUUID(),
      },
    });

    await this.outbox.publish('payment.pending', 'payment', payment.public_id, {
      invoiceId: invoice.public_id,
      amount: this.toNumber(invoice.amount),
    });

    return payment;
  }

  /** Вебхук платёжного шлюза: HMAC-верификация (заглушка) + обновление Payment и Invoice. */
  async handlePaymentCallback(dto: PaymentCallbackDto): Promise<Payment> {
    const result = await this.payGateway.handleCallback({
      paymentId: dto.paymentId,
      orderId: dto.orderId,
      status: dto.status,
      amountKzt: dto.amountKzt,
      currency: dto.currency,
      transactionId: dto.transactionId,
      paidAt: dto.paidAt,
    });
    if (!result.verified) {
      throw new BadRequestException('Неверная HMAC-подпись callback');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [{ provider_payment_id: dto.paymentId }, { public_id: dto.paymentId }],
      },
      include: { invoice: true },
    });
    if (!payment) {
      throw new NotFoundException('Платёж не найден');
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    if (dto.status === 'PAID') {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paid_at: paidAt,
            provider_response: dto as unknown as Prisma.InputJsonValue,
          },
        }),
        this.prisma.paymentInvoice.update({
          where: { id: payment.invoice_id },
          data: { status: 'PAID', paid_at: paidAt },
        }),
      ]);
      await this.outbox.publish('payment.paid', 'payment', payment.public_id, {
        invoiceId: payment.invoice.public_id,
        transactionId: dto.transactionId,
      });
    } else if (dto.status === 'FAILED') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', provider_response: dto as unknown as Prisma.InputJsonValue },
      });
    }

    return this.prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { invoice: true },
    });
  }

  /** Расчёт баланса: сумма неоплаченных счетов минус сумма оплаченных платежей. */
  async calculateBalance(userId: bigint): Promise<BalanceSummary> {
    const invoices = await this.prisma.paymentInvoice.findMany({
      where: { user_id: userId, status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } },
      select: { amount: true },
    });
    const payments = await this.prisma.payment.findMany({
      where: { user_id: userId, status: 'PAID' },
      select: { amount: true },
    });
    const totalInvoiced = invoices.reduce((sum, i) => sum + this.toNumber(i.amount), 0);
    const totalPaid = payments.reduce((sum, p) => sum + this.toNumber(p.amount), 0);
    return { totalInvoiced, totalPaid, balance: totalInvoiced - totalPaid, currency: 'KZT' };
  }

  // ---------------------------------------------------------------------------
  // Вспомогательные
  // ---------------------------------------------------------------------------

  /** Разрешение внутреннего user_id по JWT (keycloak_subject) с dev-фолбэком. */
  private async resolveUser(user: AuthUser): Promise<bigint> {
    if (this.config.get<string>('AUTH_ENABLED', 'true') === 'false') {
      const anyUser = await this.prisma.user.findFirst({
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      if (anyUser) {
        return anyUser.id;
      }
      throw new ServiceUnavailableException('В dev-режиме нет ни одного пользователя');
    }
    if (!UUID_RE.test(user.sub)) {
      throw new NotFoundException('Пользователь не найден');
    }
    const found = await this.prisma.user.findFirst({
      where: { keycloak_subject: user.sub },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Пользователь не найден');
    }
    return found.id;
  }

  /** Преобразование Decimal/number/string в number для расчётов. */
  private toNumber(value: unknown): number {
    if (value == null) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    const parsed = Number(String(value));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private certificateTitle(type: string): string {
    const titles: Record<string, string> = {
      STUDY_CONFIRMATION: 'Справка об обучении',
      TRANSCRIPT: 'Транскрипт',
      GRADE_SHEET: 'Ведомость оценок',
      ENROLLMENT: 'Справка о зачислении',
      SCHOLARSHIP: 'Справка о стипендии',
      OTHER: 'Справка',
    };
    return titles[type] ?? 'Справка';
  }
}
