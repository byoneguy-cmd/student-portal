import { Module } from '@nestjs/common';
import { IntegrationHubModule } from '../integration-hub/integration-hub.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

/**
 * Уведомления (схема notif): in-app + e-mail/SMS/push через outbox (IH).
 */
@Module({
  imports: [IntegrationHubModule],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
