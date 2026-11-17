import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

/** DTO подачи апелляции на оценку. */
export class CreateAppealDto {
  @IsInt()
  @Min(1)
  gradeId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}
