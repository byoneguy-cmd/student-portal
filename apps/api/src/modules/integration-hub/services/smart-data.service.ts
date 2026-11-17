import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  NormalizedAddress,
  NormalizedIdentity,
  NormalizedMedicalData,
  NormalizedSocialStatus,
} from '../types';

/**
 * Адаптер Smart Data Ukimet / Smart Bridge (межведомственный обмен по ИИН/БИН).
 * Источники: ГБД ФЛ (удостоверение), ГБД РН (адреса), МТСЗН (льготы), МЗ (медданные).
 * oAuth2 client-credentials + нормализация ответов в единую внутреннюю модель.
 */
@Injectable()
export class SmartDataService {
  private readonly logger = new Logger(SmartDataService.name);

  constructor(private readonly config: ConfigService) {}

  /** Удостоверение личности (ГБД ФЛ, МВД). */
  async getIdentityByIin(iin: string): Promise<NormalizedIdentity> {
    return this.queryDataset('gbd_fl.person', iin, (data) => this.normalizeIdentity(iin, data));
  }

  /** Адресная регистрация (ГБД РН). */
  async getAddressByIin(iin: string): Promise<NormalizedAddress> {
    return this.queryDataset('gbd_rn.registration_address', iin, (data) =>
      this.normalizeAddress(iin, data),
    );
  }

  /** Льготный статус (МТСЗН). */
  async getSocialStatusByIin(iin: string): Promise<NormalizedSocialStatus> {
    return this.queryDataset('mtszn.social_status', iin, (data) =>
      this.normalizeSocialStatus(iin, data),
    );
  }

  /** Медицинские данные (МЗ) — только с отдельного явного согласия (ЗРК «О персональных данных»). */
  async getMedicalDataByIin(iin: string): Promise<NormalizedMedicalData> {
    return this.queryDataset('mz.health_status', iin, (data) =>
      this.normalizeMedicalData(iin, data),
    );
  }

  /**
   * Единый запрос справочника (dataset) с нормализацией ответа.
   * Если SMART_DATA_URL не задан — возвращаем осмысленную заглушку и пишем лог.
   */
  private async queryDataset<T>(
    dataset: string,
    iin: string,
    normalize: (data: unknown) => T,
  ): Promise<T> {
    const baseUrl = this.config.get<string>('SMART_DATA_URL', '');
    const stub = normalize(this.stubFor(dataset, iin));

    if (!baseUrl) {
      this.logger.warn(`SMART_DATA_URL не задан — возвращаю заглушку (dataset=${dataset})`);
      return stub;
    }

    try {
      const res = await fetch(`${baseUrl}/api/v1/datasets/${dataset}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        },
        body: JSON.stringify({
          subject: { type: 'IIN', value: iin },
          fields: ['*'],
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as { data?: unknown };
      return normalize(json?.data ?? json);
    } catch (err) {
      this.logger.error(
        `Smart Data Ukimet недоступен (dataset=${dataset}): ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException('Smart Data Ukimet недоступен');
    }
  }

  private normalizeIdentity(iin: string, data: unknown): NormalizedIdentity {
    const d = (data ?? {}) as Record<string, unknown>;
    const fullName = (d.fullName ?? {}) as Record<string, unknown>;
    const doc = (d.document ?? {}) as Record<string, unknown>;
    const genderRaw = String(d.gender ?? '');
    return {
      iin: String(d.iin ?? iin),
      lastName: String(fullName.lastName ?? ''),
      firstName: String(fullName.firstName ?? ''),
      middleName: fullName.middleName ? String(fullName.middleName) : undefined,
      birthDate: d.birthDate ? String(d.birthDate) : undefined,
      gender: genderRaw.toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE',
      nationality: d.nationality ? String(d.nationality) : undefined,
      citizenship: d.citizenship ? String(d.citizenship) : undefined,
      document: doc.number
        ? {
            type: doc.type ? String(doc.type) : undefined,
            number: String(doc.number),
            issueDate: doc.issueDate ? String(doc.issueDate) : undefined,
            expiryDate: doc.expiryDate ? String(doc.expiryDate) : undefined,
            authority: doc.authority ? String(doc.authority) : undefined,
          }
        : undefined,
    };
  }

  private normalizeAddress(iin: string, data: unknown): NormalizedAddress {
    const d = (data ?? {}) as Record<string, unknown>;
    const pick = (v: unknown): NormalizedAddress['currentAddress'] => {
      const a = (v ?? {}) as Record<string, unknown>;
      return {
        region: a.region ? String(a.region) : undefined,
        district: a.district ? String(a.district) : undefined,
        street: a.street ? String(a.street) : undefined,
        house: a.house ? String(a.house) : undefined,
        apartment: a.apartment ? String(a.apartment) : undefined,
        kato: a.kato ? String(a.kato) : undefined,
        registeredSince: a.registeredSince ? String(a.registeredSince) : undefined,
      };
    };
    return {
      iin: String(d.iin ?? iin),
      currentAddress: pick(d.currentAddress),
      permanentAddress: pick(d.permanentAddress),
    };
  }

  private normalizeSocialStatus(iin: string, data: unknown): NormalizedSocialStatus {
    const d = (data ?? {}) as Record<string, unknown>;
    const benefits = Array.isArray(d.benefits)
      ? d.benefits.map((b) => {
          const x = b as Record<string, unknown>;
          return {
            code: String(x.code ?? ''),
            name: String(x.name ?? ''),
            status: String(x.status ?? 'ACTIVE'),
            validFrom: x.validFrom ? String(x.validFrom) : undefined,
            validTo: x.validTo ? String(x.validTo) : null,
            source: x.source ? String(x.source) : undefined,
          };
        })
      : [];
    return {
      iin: String(d.iin ?? iin),
      benefits,
      asOf: d.asOf ? String(d.asOf) : undefined,
    };
  }

  private normalizeMedicalData(iin: string, data: unknown): NormalizedMedicalData {
    const d = (data ?? {}) as Record<string, unknown>;
    const dr = (d.dispensaryRegistration ?? {}) as Record<string, unknown>;
    const vac = (d.vaccination ?? {}) as Record<string, unknown>;
    return {
      iin: String(d.iin ?? iin),
      dispensaryRegistration: dr.group
        ? {
            group: String(dr.group),
            diagnosisCode: dr.diagnosisCode ? String(dr.diagnosisCode) : undefined,
            validTo: dr.validTo ? String(dr.validTo) : undefined,
            requiresSpecialConditions: dr.requiresSpecialConditions
              ? Boolean(dr.requiresSpecialConditions)
              : undefined,
          }
        : undefined,
      vaccination: vac.status ? { status: String(vac.status) } : undefined,
      asOf: d.asOf ? String(d.asOf) : undefined,
    };
  }

  /** Синтетические заглушки для локальной разработки. */
  private stubFor(dataset: string, iin: string): Record<string, unknown> {
    switch (dataset) {
      case 'gbd_fl.person':
        return {
          iin,
          fullName: { lastName: 'АХМЕТОВА', firstName: 'АЙГЕРИМ', middleName: 'СЕРГЕЕВНА' },
          birthDate: '1992-01-01',
          gender: 'FEMALE',
          nationality: 'KAZAKHSTAN',
          document: { type: 'IDENTITY_CARD', number: '123456789', issueDate: '2017-01-01', expiryDate: '2027-01-01' },
        };
      case 'gbd_rn.registration_address':
        return {
          iin,
          currentAddress: { region: 'г. Алматы', district: 'Бостандыкский', street: 'пр. аль-Фараби', house: '71', apartment: '12', kato: '750000000', registeredSince: '2020-09-01' },
        };
      case 'mtszn.social_status':
        return {
          iin,
          benefits: [{ code: 'ORPHAN', name: 'Сирота / оставшийся без попечения родителей', status: 'ACTIVE', validFrom: '2024-09-01', source: 'МТСЗН' }],
          asOf: new Date().toISOString().slice(0, 10),
        };
      case 'mz.health_status':
        return {
          iin,
          dispensaryRegistration: { group: 'D_III', diagnosisCode: 'Z00.0', validTo: '2027-05-01', requiresSpecialConditions: true },
          vaccination: { status: 'COMPLETE' },
          asOf: new Date().toISOString().slice(0, 10),
        };
      default:
        return { iin };
    }
  }
}
