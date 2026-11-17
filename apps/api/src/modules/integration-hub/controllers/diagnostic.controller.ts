import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../../common/auth/public.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { OutboxService } from '../services/outbox.service';

/**
 * Диагностические эндпоинты Integration Hub: статусы адаптеров и очередь outbox.
 */
@Controller('integration-hub')
export class DiagnosticController {
  constructor(
    private readonly config: ConfigService,
    private readonly outbox: OutboxService,
  ) {}

  /** Статусы адаптеров (заглушка: `ok` при настроенном URL, иначе `degraded`). */
  @Public()
  @Get('health')
  health(): Record<string, unknown> {
    return {
      status: 'ok',
      adapters: {
        'smart-data': this.statusOf('SMART_DATA_URL'),
        nobd: this.statusOf('NOBD_URL'),
        'egov-qr': this.statusOf('EGOV_BASE_URL'),
        ncalayer: 'ok', // локальный агент 127.0.0.1:13579
        lms: 'ok',
        skud: this.statusOf('SKUD_BASE_URL'),
        canteen: this.statusOf('CANTEEN_BASE_URL'),
        payment: this.statusOf('PAY_GATEWAY_URL'),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /** Список ожидающих событий outbox (диагностика). */
  @Roles('ADMIN')
  @Get('outbox/pending')
  async pendingOutbox(): Promise<{ count: number; events: unknown[] }> {
    const events = await this.outbox.listPending();
    return { count: events.length, events };
  }

  private statusOf(key: string): string {
    return this.config.get<string>(key, '') ? 'ok' : 'degraded';
  }
}
