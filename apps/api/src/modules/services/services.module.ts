import { Module } from '@nestjs/common';
import { IntegrationHubModule } from '../integration-hub/integration-hub.module';
import { CertificateController } from './controllers/certificate.controller';
import { PaymentController } from './controllers/payment.controller';
import { ServicesService } from './services/services.service';

/**
 * Университетские услуги (схема svc): справки и счета/платежи.
 * Использует адаптеры Integration Hub (платёжный шлюз, outbox).
 */
@Module({
  imports: [IntegrationHubModule],
  controllers: [CertificateController, PaymentController],
  providers: [ServicesService],
})
export class ServicesModule {}
