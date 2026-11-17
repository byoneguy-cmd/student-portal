import { IsInt, IsOptional, Min } from 'class-validator';

/** Общий query-DTO с необязательным идентификатором учебного периода (termId). */
export class TermQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  termId?: number;
}

/** Query-DTO расписания: termId + неделя. */
export class ScheduleQueryDto extends TermQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  week?: number;
}
