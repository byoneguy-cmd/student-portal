import { Injectable } from '@nestjs/common';

/**
 * Сервис импорта данных по ИИН из внешних источников
 * (Smart Data Ukimet / НОБД / ГБД). Реальная интеграция — TODO.
 */
@Injectable()
export class IinImportService {
  /**
   * Заглушка запроса к внешнему источнику данных по ИИН.
   * TODO: реальный HTTP-запрос с ЭЦП/токеном источника и обработкой ответа.
   */
  async fetch(iinToken: string, source: string): Promise<Record<string, unknown>> {
    // TODO: заменить на реальный вызов внешнего сервиса.
    return {
      source,
      iin_token: iinToken,
      first_name: 'Иван',
      last_name: 'Иванов',
      middle_name: 'Иванович',
      birth_date: '2000-01-01',
      imported_at: new Date().toISOString(),
    };
  }
}
