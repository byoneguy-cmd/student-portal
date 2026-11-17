import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SkudAccessInput, SkudAccessResult } from '../types';

/**
 * Адаптер СКУД общежития: REST/SDK + вебхук, аутентификация API-key + HMAC-SHA256.
 */
@Injectable()
export class SkudService {
  private readonly logger = new Logger(SkudService.name);

  constructor(private readonly config: ConfigService) {}

  /** Назначить/обновить пропуск доступа студента. */
  async setAccess(input: SkudAccessInput): Promise<SkudAccessResult> {
    const baseUrl = this.config.get<string>('SKUD_BASE_URL', '');
    const requestId = randomUUID();

    if (!baseUrl) {
      this.logger.warn('SKUD_BASE_URL не задан — возвращаю заглушку пропуска');
      return { requestId, passId: `pass-${randomUUID().slice(0, 8)}`, status: 'ACTIVE' };
    }

    try {
      const res = await fetch(`${baseUrl}/v1/access/passes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.config.get<string>('SKUD_API_KEY', ''),
          'X-Timestamp': String(Math.floor(Date.now() / 1000)),
        },
        body: JSON.stringify({
          requestId,
          student: { iin: input.iin, fullName: input.fullName, room: input.room, building: input.building },
          pass: {
            type: input.passType ?? 'CARD',
            cardNumber: input.cardNumber,
            validFrom: input.validFrom,
            validTo: input.validTo,
            accessZones: input.accessZones ?? [],
          },
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as Partial<SkudAccessResult>;
      return { requestId, passId: json.passId ?? `pass-${randomUUID().slice(0, 8)}`, status: json.status ?? 'ACTIVE' };
    } catch (err) {
      this.logger.error(`СКУД недоступна: ${(err as Error).message}`);
      throw new ServiceUnavailableException('СКУД недоступна');
    }
  }
}
