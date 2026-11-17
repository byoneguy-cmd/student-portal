/**
 * Контракты адаптера учётной системы столовой (REST/SDK + вебхук, API-key + HMAC-SHA256).
 */

/** Запрос синхронизации статуса льготника. */
export interface CanteenBeneficiaryInput {
  iin: string;
  fullName: string;
  code: string;
  name?: string;
  mealsPerDay?: number;
  dailyLimitKzt?: number;
  validFrom?: string;
  validTo?: string;
  status?: string;
}

/** Результат синхронизации льготника. */
export interface CanteenBeneficiaryResult {
  requestId: string;
  beneficiaryId: string;
  status: string;
}
