/**
 * Контракты адаптера НОБД (национальная образовательная БД, МНВО РК).
 * Адаптер скрывает разницу REST/SOAP и отдаёт единый интерфейс.
 */

/** Запрос контингента по ИИН. */
export interface NobdContingentRequest {
  iin: string;
  academicYear?: string;
  organizationBin?: string;
}

/** Нормализованный результат: контингент студента. */
export interface StudentContingent {
  iin: string;
  /** true, если студент зачислен и обучается (status === STUDYING). */
  enrolled: boolean;
  status?: string;
  course?: number;
  /** Название/код образовательной программы. */
  program?: string;
  specialtyCode?: string;
  specialtyName?: string;
  /** Нормализованная форма обучения: FULL_TIME / PART_TIME / EVENING / DISTANCE. */
  educationForm?: string;
  /** Основа обучения: BUDGET / PAID. */
  educationBase?: string;
  degree?: string;
  group?: string;
  organization?: {
    bin?: string;
    name?: string;
    kato?: string;
  };
  asOf?: string;
}
