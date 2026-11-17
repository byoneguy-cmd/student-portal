/**
 * Контракты адаптера eGov Mobile QR (авторизация/подписание).
 * Точный deep-link и формат подписи — по техпаспорту оператора (АО «НИТ» / АО «ЦЭБ»).
 */

/** Инициализация challenge. */
export interface QrChallengeInit {
  serviceId: string;
  purpose: 'AUTH' | 'SIGN';
  ttlSeconds?: number;
  redirectAfterSuccess?: string;
  scope?: string[];
}

/** Созданный challenge для отрисовки QR. */
export interface QrChallenge {
  challengeId: string;
  qrPayload: string;
  expiresAt: string;
  ttlSeconds: number;
}

/** Входные данные верификации подписи (callback eGov Mobile). */
export interface QrSignatureVerificationInput {
  challengeId: string;
  signedData: string;
  certificate: string;
  signatureAlgorithm?: string;
  signedAt?: string;
}

/** Результат верификации QR-подписи. */
export interface QrSignatureVerification {
  challengeId: string;
  verified: boolean;
  status: string;
  identity?: {
    iin: string;
    fullName: string;
    certificateSerial?: string;
    issuerDN?: string;
  };
}
