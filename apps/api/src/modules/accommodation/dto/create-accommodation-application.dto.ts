import { IsInt, IsOptional, IsPositive, Min } from 'class-validator';

/** Тело POST /accommodation/applications — заявка студента на место в общежитии. */
export class CreateAccommodationApplicationDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  preferredDormitoryId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  preferredRoomId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  academicTermId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  eligibilityId?: number;

  /** Приоритет заявки (больше — выше); по умолчанию 0. */
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
