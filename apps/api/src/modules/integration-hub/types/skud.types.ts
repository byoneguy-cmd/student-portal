/**
 * Контракты адаптера СКУД общежития (REST/SDK + вебхук, API-key + HMAC-SHA256).
 */

/** Запрос назначения пропуска. */
export interface SkudAccessInput {
  iin: string;
  fullName: string;
  room?: string;
  building?: string;
  passType?: 'CARD' | 'QR' | 'BIOMETRIC';
  cardNumber?: string;
  validFrom?: string;
  validTo?: string;
  accessZones?: string[];
}

/** Результат назначения пропуска. */
export interface SkudAccessResult {
  requestId: string;
  passId: string;
  status: string;
}
