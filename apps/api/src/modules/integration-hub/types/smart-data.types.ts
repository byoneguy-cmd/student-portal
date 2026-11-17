/**
 * Контракты адаптера Smart Data Ukimet / Smart Bridge.
 * Внешние ответы (ГБД ФЛ, ГБД РН, МТСЗН, МЗ) нормализуются в единую внутреннюю модель.
 */

/** Единая внутренняя модель удостоверения личности. */
export interface NormalizedIdentity {
  iin: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE';
  nationality?: string;
  citizenship?: string;
  document?: {
    type?: string;
    number?: string;
    issueDate?: string;
    expiryDate?: string;
    authority?: string;
  };
}

/** Адресная часть (регистрация/проживание). */
export interface NormalizedAddressPart {
  region?: string;
  district?: string;
  street?: string;
  house?: string;
  apartment?: string;
  kato?: string;
  registeredSince?: string;
}

/** Единая внутренняя модель адресной регистрации. */
export interface NormalizedAddress {
  iin: string;
  currentAddress?: NormalizedAddressPart;
  permanentAddress?: NormalizedAddressPart;
}

/** Единая внутренняя модель льготного статуса (МТСЗН). */
export interface NormalizedSocialStatus {
  iin: string;
  benefits: Array<{
    code: string;
    name: string;
    status: string;
    validFrom?: string;
    validTo?: string | null;
    source?: string;
  }>;
  asOf?: string;
}

/** Единая внутренняя модель медицинских данных (МЗ) — запрашивается только с явным согласием. */
export interface NormalizedMedicalData {
  iin: string;
  dispensaryRegistration?: {
    group?: string;
    diagnosisCode?: string;
    validTo?: string;
    requiresSpecialConditions?: boolean;
  };
  vaccination?: {
    status?: string;
  };
  asOf?: string;
}
