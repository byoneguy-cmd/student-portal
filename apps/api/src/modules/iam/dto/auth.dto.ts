import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO завершения авторизации через eGov Mobile.
 * Реальная интеграция с eGov Mobile — TODO; здесь принимаются только
 * необходимые для upsert-а данные.
 */
export class EgovMobileCompleteDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  /** Авторизационный код/токен eGov Mobile (в заглушке не проверяется). */
  @IsOptional()
  @IsString()
  code?: string;

  /** ИИН, «извлечённый» из ответа eGov Mobile (в реальной интеграции приходит от eGov). */
  @IsOptional()
  @IsString()
  iin?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

/**
 * DTO завершения авторизации через NCALayer (ЭЦП).
 */
export class NcaLayerCompleteDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  /** ИИН из сертификата ЭЦП (в заглушке передаётся явно). */
  @IsOptional()
  @IsString()
  iin?: string;

  @IsOptional()
  @IsString()
  certificateSerial?: string;

  @IsOptional()
  @IsString()
  certificateIssuer?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
