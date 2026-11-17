import { IsArray, IsOptional, IsString } from 'class-validator';

/** DTO сдачи домашнего задания. */
export class CreateSubmissionDto {
  /** Файлы сдачи (хранятся в JSON-поле files). */
  @IsOptional()
  @IsArray()
  files?: unknown[];

  @IsOptional()
  @IsString()
  comment?: string;
}
