/**
 * Контракты платёжного шлюза (Halyk ePay / eGov Pay).
 * Флоу: создание заказа → редирект 3-D Secure → callback.
 */

/** Запрос создания платежа. */
export interface CreatePaymentRequest {
  orderId: string;
  amountKzt: number;
  currency?: string;
  description?: string;
  customerIin?: string;
  customerName?: string;
  customerEmail?: string;
  purposeCode?: string;
  returnUrl?: string;
  callbackUrl?: string;
}

/** Результат создания платежа. */
export interface CreatePaymentResult {
  paymentId: string;
  orderId: string;
  status: string;
  redirectUrl?: string;
  createdAt: string;
}

/** Callback от платёжного шлюза. */
export interface PaymentCallbackPayload {
  paymentId: string;
  orderId?: string;
  status: string;
  amountKzt?: number;
  currency?: string;
  transactionId?: string;
  authCode?: string;
  paidAt?: string;
  eci?: string;
  cardMasked?: string;
}

/** Нормализованный результат обработки callback. */
export interface PaymentCallbackResult {
  verified: boolean;
  paymentId: string;
  orderId?: string;
  status: string;
  transactionId?: string;
  amountKzt?: number;
  paidAt?: string;
}
