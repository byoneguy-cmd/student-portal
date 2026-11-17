import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Минимальные данные заявления, необходимые для outbox-события в столовую. */
export interface MealApplicationRef {
  id: bigint;
  public_id: string;
  user_id: bigint;
}

@Injectable()
export class MealSyncService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Записывает outbox-событие «заявление отправлено» для столовой.
   * При передаче tx событие пишется в той же транзакции, что и бизнес-данные.
   */
  async enqueueMealOutbox(meal: MealApplicationRef, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    await client.outboxEvent.create({
      data: {
        id: this.nextOutboxId(),
        aggregate_type: 'MealApplication',
        aggregate_id: meal.public_id,
        event_type: 'meal_application.submitted',
        payload: { mealApplicationId: meal.public_id, userId: String(meal.user_id) },
        topic: 'canteen',
        status: 'PENDING',
      },
    });
  }

  /** Заглушка HTTP-синхронизации со столовой (вызывается publisher'ом outbox). */
  async syncToCanteen(payload: Prisma.InputJsonValue): Promise<void> {
    // TODO: реальный вызов через Integration Hub (адрес и токены — из конфигурации).
    try {
      await fetch('http://localhost:9200/canteen/meal-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Заглушка: событие остаётся в outbox и будет повторено.
    }
  }

  /** Генерирует уникальный id outbox-события (в raw-миграции id — IDENTITY). */
  private nextOutboxId(): bigint {
    const millis = BigInt(Date.now());
    const random = BigInt(Math.floor(Math.random() * 0x100000));
    return (millis << 20n) | random;
  }
}
