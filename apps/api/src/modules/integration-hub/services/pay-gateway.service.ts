import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  CreatePaymentRequest,
  CreatePaymentResult,
  PaymentCallbackPayload,
  PaymentCallbackResult,
} from '../types';

/**
 * Адаптер платёжного шлюза (Halyk ePay / eGov Pay).
 * Флоу: создание заказа → редирект 3-D Secure → callback с HMAC-подписью.
 */
@Injectable()
export class PayGatewayService {
  private readonly logger = new Logger(PayGatewayService.name);

  constructor(private readonly config: ConfigService) {}

  /** Создать платёж во внешнем шлюзе. Если URL пуст — возвращаем заглушку. */
  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
    const baseUrl = this.config.get<string>('PAY_GATEWAY_URL', '');
    const paymentId = `pay-${randomUUID().slice(0, 12)}`;

    if (!baseUrl) {
      this.logger.warn('PAY_GATEWAY_URL не задан — возвращаю заглушку платежа');
      return this.stubResult(paymentId, request);
    }

    try {
      const res = await fetch(`${baseUrl}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        },
        body: JSON.stringify({
          merchantId: this.config.get<string>('MERCHANT_ID', ''),
          orderId: request.orderId,
          amountKzt: request.amountKzt,
          currency: request.currency ?? 'KZT',
          description: request.description,
          customer: {
            iin: request.customerIin,
            fullName: request.customerName,
            email: request.customerEmail,
          },
          purposeCode: request.purposeCode,
          returnUrl: request.returnUrl,
          callbackUrl: request.callbackUrl,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as Partial<CreatePaymentResult>;
      return {
        paymentId: json.paymentId ?? paymentId,
        orderId: json.orderId ?? request.orderId,
        status: json.status ?? 'CREATED',
        redirectUrl: json.redirectUrl,
        createdAt: json.createdAt ?? new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error(`Платёжный шлюз недоступен: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Платёжный шлюз недоступен');
    }
  }

  /**
   * Обработка callback: проверка HMAC-подписи. Здесь — заглушка (подпись не проверяется).
   * В проде: HMAC-SHA256(secret, canonical) обязателен; несовпадение → 401.
   */
  async handleCallback(payload: PaymentCallbackPayload): Promise<PaymentCallbackResult> {
    this.logger.log('handleCallback — HMAC-верификация заглушена');
    return {
      verified: true,
      paymentId: payload.paymentId,
      orderId: payload.orderId,
      status: payload.status,
      transactionId: payload.transactionId,
      amountKzt: payload.amountKzt,
      paidAt: payload.paidAt,
    };
  }

  private stubResult(paymentId: string, request: CreatePaymentRequest): CreatePaymentResult {
    const threeDsUrl = this.config.get<string>('PAY_GATEWAY_3DS_URL', 'https://pay.example.kz/3ds');
    return {
      paymentId,
      orderId: request.orderId,
      status: 'CREATED',
      redirectUrl: `${threeDsUrl}?paymentId=${paymentId}`,
      createdAt: new Date().toISOString(),
    };
  }
}
