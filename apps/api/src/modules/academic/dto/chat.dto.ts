import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Допустимые типы сообщений (enum MessageType). */
export const MESSAGE_TYPES = ['TEXT', 'FILE', 'SYSTEM'] as const;
export type MessageTypeValue = (typeof MESSAGE_TYPES)[number];

/** DTO отправки сообщения в чате. */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsOptional()
  @IsIn(MESSAGE_TYPES)
  msg_type?: MessageTypeValue;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];
}
