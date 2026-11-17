import { Injectable, Logger } from '@nestjs/common';
import { OutboxEvent, OutboxStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Transactional Outbox: события пишутся в той же транзакции, что и бизнес-данные,
 * затем асинхронный worker публикует их в брокер (RabbitMQ → Kafka, ADR-004).
 * Здесь публикация — заглушка (помечаем PUBLISHED без реального брокера).
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Записывает событие в ops.outbox_events со статусом PENDING.
   * @param eventType     каноническое имя события (например `payment.paid`).
   * @param aggregateType тип агрегата (`certificate` / `payment` / `notification`).
   * @param aggregateId   UUID публичного идентификатора агрегата (public_id).
   * @param payload       доменный payload.
   */
  async publish(
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
  ): Promise<OutboxEvent> {
    return this.prisma.outboxEvent.create({
      data: {
        id: this.nextId(),
        aggregate_type: aggregateType,
        aggregate_id: aggregateId,
        event_type: eventType,
        payload: (payload ?? {}) as Prisma.InputJsonValue,
        status: 'PENDING',
        topic: this.topicFor(eventType),
      },
    });
  }

  /** Список ожидающих событий (диагностика). */
  async listPending(limit = 100): Promise<OutboxEvent[]> {
    return this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { available_at: 'asc' },
      take: limit,
    });
  }

  /**
   * Обрабатывает ожидающие события: PENDING → PUBLISHED.
   * В проде вызывается worker'ом/крон-джобом и публикует в RabbitMQ; здесь заглушка.
   */
  async consumePending(limit = 100): Promise<OutboxEvent[]> {
    const pending = await this.listPending(limit);
    if (pending.length === 0) {
      return [];
    }

    // Заглушка RabbitMQ: помечаем PUBLISHED без реальной публикации в брокер.
    await this.prisma.outboxEvent.updateMany({
      where: { status: 'PENDING', id: { in: pending.map((e) => e.id) } },
      data: {
        status: 'PUBLISHED',
        published_at: new Date(),
        attempt_count: { increment: 1 },
      },
    });

    this.logger.log(`Outbox: ${pending.length} событие(й) помечено PUBLISHED (заглушка RabbitMQ)`);

    const publishedAt = new Date();
    return pending.map((e) => ({ ...e, status: 'PUBLISHED' as OutboxStatus, published_at: publishedAt }));
  }

  /** Простейший маппинг события в тему; в проде — по Contract Registry. */
  private topicFor(eventType: string): string {
    const domain = eventType.split('.')[0] ?? 'default';
    return `events.${domain}`;
  }

  /**
   * Генерация BigInt-идентификатора для партиционированной таблицы
   * (в БД id задаётся IDENTITY в raw-миграции; здесь — заглушка для Prisma).
   */
  private nextId(): bigint {
    return BigInt(Date.now()) * 1_000_000n + BigInt(Math.floor(Math.random() * 1_000_000));
  }
}
