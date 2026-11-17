import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

/** Callback от платёжного шлюза (webhook). HMAC-верификация — заглушка. */
export class PaymentCallbackDto {
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsString()
  @IsIn(['CREATED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED'])
  status: string;

  @IsOptional()
  @IsNumber()
  amountKzt?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  authCode?: string;

  @IsOptional()
  @IsString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  eci?: string;

  @IsOptional()
  @IsString()
  cardMasked?: string;
}
