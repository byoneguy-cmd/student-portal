import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { NobdContingentRequest, StudentContingent } from '../types';

/**
 * Адаптер НОБД (национальная образовательная БД, ведение — МНВО РК).
 * Запрашивает контингент обучающегося по ИИН. REST/SOAP-разницу скрывает адаптер.
 */
@Injectable()
export class NobdService {
  private readonly logger = new Logger(NobdService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Контингент студента по ИИН → { enrolled, program, educationForm }.
   * @param iin           12-значный ИИН.
   * @param academicYear  учебный год (например «2026-2027»).
   */
  async getStudentContingentByIin(iin: string, academicYear?: string): Promise<StudentContingent> {
    const request: NobdContingentRequest = {
      iin,
      academicYear: academicYear ?? '2026-2027',
      organizationBin: this.config.get<string>('UNIVERSITY_BIN', ''),
    };
    const baseUrl = this.config.get<string>('NOBD_URL', '');

    if (!baseUrl) {
      this.logger.warn('NOBD_URL не задан — возвращаю заглушку контингента');
      return this.stub(iin);
    }

    try {
      const res = await fetch(`${baseUrl}/api/v1/contingent/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as { contingent?: unknown };
      return this.normalize(iin, json?.contingent ?? json);
    } catch (err) {
      this.logger.error(`НОБД недоступна: ${(err as Error).message}`);
      throw new ServiceUnavailableException('НОБД недоступна');
    }
  }

  private normalize(iin: string, raw: unknown): StudentContingent {
    const c = (raw ?? {}) as Record<string, unknown>;
    const e = (c.enrollment ?? {}) as Record<string, unknown>;
    const org = (c.organization ?? {}) as Record<string, unknown>;
    const status = e.status ? String(e.status) : undefined;
    return {
      iin: String(c.iin ?? iin),
      enrolled: status === 'STUDYING',
      status,
      course: typeof e.course === 'number' ? e.course : Number(e.course) || undefined,
      program: e.specialtyName ? String(e.specialtyName) : e.specialtyCode ? String(e.specialtyCode) : undefined,
      specialtyCode: e.specialtyCode ? String(e.specialtyCode) : undefined,
      specialtyName: e.specialtyName ? String(e.specialtyName) : undefined,
      educationForm: e.educationForm ? String(e.educationForm) : undefined,
      educationBase: e.educationBase ? String(e.educationBase) : undefined,
      degree: e.degree ? String(e.degree) : undefined,
      group: e.group ? String(e.group) : undefined,
      organization: org.bin
        ? { bin: String(org.bin), name: org.name ? String(org.name) : undefined, kato: org.kato ? String(org.kato) : undefined }
        : undefined,
      asOf: c.asOf ? String(c.asOf) : undefined,
    };
  }

  private stub(iin: string): StudentContingent {
    return {
      iin,
      enrolled: true,
      status: 'STUDYING',
      course: 4,
      program: 'Информационные системы',
      specialtyCode: '6B06102',
      specialtyName: 'Информационные системы',
      educationForm: 'FULL_TIME',
      educationBase: 'BUDGET',
      degree: 'BACHELOR',
      group: 'ИС-22-1',
      asOf: new Date().toISOString().slice(0, 10),
    };
  }
}
