import { IsIn, IsISO8601, IsOptional } from 'class-validator';

/** Тело POST /social/meal-applications — заявление на льготное питание. */
export class CreateMealApplicationDto {
  @IsOptional()
  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER', 'ALL_DAY'])
  mealPeriod?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'ALL_DAY';

  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @IsOptional()
  @IsISO8601()
  validTo?: string;
}
