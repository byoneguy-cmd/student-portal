import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

/** Допустимые источники импорта данных по ИИН (значения enum ImportSource). */
export const IMPORT_SOURCES = [
  'SMART_DATA_UKIMET',
  'NOBD',
  'EGOV_MOBILE',
  'GBD_FL',
  'GBD_RN',
  'MTSZN',
  'MZ',
  'MANUAL',
] as const;

export type ImportSourceValue = (typeof IMPORT_SOURCES)[number];

/**
 * DTO частичного обновления профиля пользователя (user_profiles).
 * Все поля опциональны; отсутствующие не изменяются.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  middle_name?: string;

  @IsOptional()
  @IsString()
  iin_short?: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  citizenship?: string;

  @IsOptional()
  @IsString()
  home_address?: string;

  @IsOptional()
  @IsString()
  registration_address?: string;

  @IsOptional()
  @IsString()
  document_type?: string;

  @IsOptional()
  @IsString()
  document_number?: string;

  @IsOptional()
  @IsDateString()
  document_issue_date?: string;

  @IsOptional()
  @IsObject()
  emergency_contact?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

/** DTO запуска импорта данных из внешнего источника. */
export class ImportProfileDto {
  @IsNotEmpty()
  @IsIn(IMPORT_SOURCES)
  source!: ImportSourceValue;
}
