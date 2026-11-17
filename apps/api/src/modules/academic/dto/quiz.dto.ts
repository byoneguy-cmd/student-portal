import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';

/** Ответ на один вопрос теста. */
export class QuizAnswerDto {
  @IsInt()
  @Min(1)
  questionId!: number;

  /** Выбранный ответ (вариант/текст — зависит от типа вопроса). */
  @IsOptional()
  answer?: unknown;
}

/** DTO сдачи попытки теста. */
export class SubmitQuizAttemptDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers?: QuizAnswerDto[];
}
