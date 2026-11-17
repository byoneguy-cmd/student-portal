import { IsArray, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/** Тело POST /documents/packages — создание пакета документов. */
export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** id существующих документов, включаемых в пакет (необязательно). */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  documentIds?: number[];
}
