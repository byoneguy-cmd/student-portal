import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Notification,
  NotificationChannel,
  NotificationPriority,
  Prisma,
} from '@prisma/client';
import type { AuthUser } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OutboxService } from '../integration-hub/services/outbox.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Уведомления (схема notif): e-mail/SMS/push/in-app.
 * Email/SMS/Push — заглушка через outbox (в проде рассылает worker).
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Создать уведомление + outbox-событие для внешних каналов.
   * @param userId   внутренний id пользователя (iam.users.id).
   * @param channel  канал доставки.
   * @param priority приоритет.
   * @param title    заголовок (в БД — поле subject).
   * @param body     текст.
   * @param payload  произвольный payload.
   */
  async create(
    userId: bigint,
    channel: NotificationChannel,
    priority: NotificationPriority,
    title?: string,
    body?: string,
    payload: Record<string, unknown> = {},
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        id: this.nextId(),
        user_id: userId,
        channel,
        priority,
        status: 'PENDING',
        subject: title,
        body,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    // Email/SMS/Push — заглушка: публикуем событие в outbox (рассыльщик в проде).
    if (channel !== 'IN_APP') {
      await this.outbox.publish(
        `notification.${channel.toLowerCase()}`,
        'notification',
        notification.public_id,
        { channel, priority, subject: title, body, userId: userId.toString() },
      );
    }

    return notification;
  }

  /** Создать уведомление от имени администратора (по public_id получателя). */
  async createByDto(dto: CreateNotificationDto): Promise<Notification> {
    const target = await this.prisma.user.findUnique({ where: { public_id: dto.userId } });
    if (!target) {
      throw new NotFoundException('Получатель не найден');
    }
    return this.create(
      target.id,
      dto.channel,
      dto.priority ?? 'NORMAL',
      dto.title,
      dto.body,
      dto.payload ?? {},
    );
  }

  /** Список уведомлений текущего пользователя. */
  async listForUser(user: AuthUser): Promise<Notification[]> {
    const userId = await this.resolveUser(user);
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  /** Пометить уведомление прочитанным (по public_id). */
  async markRead(user: AuthUser, id: string): Promise<Notification> {
    const userId = await this.resolveUser(user);
    const notification = await this.prisma.notification.findFirst({
      where: { public_id: id, user_id: userId },
    });
    if (!notification) {
      throw new NotFoundException('Уведомление не найдено');
    }
    if (notification.status === 'READ') {
      return notification;
    }
    return this.prisma.notification.update({
      where: { public_id: id },
      data: { status: 'READ', read_at: new Date() },
    });
  }

  /** Разрешение внутреннего user_id по JWT (keycloak_subject) с dev-фолбэком. */
  private async resolveUser(user: AuthUser): Promise<bigint> {
    if (this.config.get<string>('AUTH_ENABLED', 'true') === 'false') {
      const anyUser = await this.prisma.user.findFirst({
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      if (anyUser) {
        return anyUser.id;
      }
      throw new ServiceUnavailableException('В dev-режиме нет ни одного пользователя');
    }
    if (!UUID_RE.test(user.sub)) {
      throw new NotFoundException('Пользователь не найден');
    }
    const found = await this.prisma.user.findFirst({
      where: { keycloak_subject: user.sub },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Пользователь не найден');
    }
    return found.id;
  }

  /**
   * Генерация BigInt-идентификатора для партиционированной таблицы notif
   * (в БД id задаётся IDENTITY в raw-миграции; здесь — заглушка для Prisma).
   */
  private nextId(): bigint {
    return BigInt(Date.now()) * 1_000_000n + BigInt(Math.floor(Math.random() * 1_000_000));
  }
}
