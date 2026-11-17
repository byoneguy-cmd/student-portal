import { Module } from '@nestjs/common';
import { DiagnosticController } from './controllers/diagnostic.controller';
import { CanteenService } from './services/canteen.service';
import { EgovService } from './services/egov.service';
import { LmsService } from './services/lms.service';
import { NcaLayerService } from './services/ncalayer.service';
import { NobdService } from './services/nobd.service';
import { OutboxService } from './services/outbox.service';
import { PayGatewayService } from './services/pay-gateway.service';
import { SkudService } from './services/skud.service';
import { SmartDataService } from './services/smart-data.service';

/**
 * Integration Hub (ADR-007): единственная точка всех внешних вызовов.
 * Адаптеры инкапсулируют протоколы внешних систем и нормализуют данные.
 * Сервисный модуль: экспортирует адаптеры для доменных модулей.
 */
@Module({
  controllers: [DiagnosticController],
  providers: [
    SmartDataService,
    NobdService,
    EgovService,
    NcaLayerService,
    LmsService,
    SkudService,
    CanteenService,
    PayGatewayService,
    OutboxService,
  ],
  exports: [
    SmartDataService,
    NobdService,
    EgovService,
    NcaLayerService,
    LmsService,
    SkudService,
    CanteenService,
    PayGatewayService,
    OutboxService,
  ],
})
export class IntegrationHubModule {}
