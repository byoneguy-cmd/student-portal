import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CertificateType } from '@prisma/client';

/** Тело запроса на создание справки. */
export class CreateCertificateDto {
  @IsEnum(CertificateType)
  type: CertificateType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  purpose?: string;
}
