import { IsInt, IsISO8601, IsOptional, IsPositive } from 'class-validator';

/**
 * Тело POST /accommodation/allocations (admin).
 * Если заданы applicationId и roomId — точечное заселение;
 * если оба не заданы — запуск автоматического распределения (льготники первыми).
 */
export class CreateAllocationDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  applicationId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  roomId?: number;

  @IsOptional()
  @IsISO8601()
  checkInDate?: string;

  @IsOptional()
  @IsISO8601()
  checkOutDate?: string;
}
