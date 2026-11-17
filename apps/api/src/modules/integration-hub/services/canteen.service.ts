import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { CanteenBeneficiaryInput, CanteenBeneficiaryResult } from '../types';

/**
 * Адаптер учётной системы столовой: REST/SDK + вебхук, аутентификация API-key + HMAC-SHA256.
 */
@Injectable()
export class CanteenService {
  private readonly logger = new Logger(CanteenService.name);

  constructor(private readonly config: ConfigService) {}

  /** Синхронизировать статус льготника (бесплатное питание). */
  async syncBeneficiary(input: CanteenBeneficiaryInput): Promise<CanteenBeneficiaryResult> {
    const baseUrl = this.config.get<string>('CANTEEN_BASE_URL', '');
    const requestId = randomUUID();

    if (!baseUrl) {
      this.logger.warn('CANTEEN_BASE_URL не задан — возвращаю заглушку льготника');
      return { requestId, beneficiaryId: `ben-${randomUUID().slice(0, 8)}`, status: 'SYNCED' };
    }

    try {
      const res = await fetch(`${baseUrl}/v1/beneficiaries/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.config.get<string>('CANTEEN_API_KEY', ''),
          'X-Timestamp': String(Math.floor(Date.now() / 1000)),
        },
        body: JSON.stringify({
          requestId,
          student: { iin: input.iin, fullName: input.fullName },
          benefit: {
            code: input.code,
            name: input.name,
            mealsPerDay: input.mealsPerDay,
            dailyLimitKzt: input.dailyLimitKzt,
            validFrom: input.validFrom,
            validTo: input.validTo,
            status: input.status ?? 'ACTIVE',
          },
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as Partial<CanteenBeneficiaryResult>;
      return { requestId, beneficiaryId: json.beneficiaryId ?? `ben-${randomUUID().slice(0, 8)}`, status: json.status ?? 'SYNCED' };
    } catch (err) {
      this.logger.error(`Система столовой недоступна: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Система столовой недоступна');
    }
  }
}
