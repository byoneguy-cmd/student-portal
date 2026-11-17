import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { NotificationChannel, NotificationPriority } from '@prisma/client';

/** Создание уведомления (admin). */
export class CreateNotificationDto {
  /** public_id (UUID) пользователя-получателя. */
  @IsUUID()
  userId: string;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
