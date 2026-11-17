import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Тело POST /social/eligibilities/check — проверка права на льготу по коду вида. */
export class CheckEligibilityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  benefitTypeCode!: string;
}
