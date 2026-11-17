import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { SocialBenefitsService } from './social-benefits.service';
import { MealSyncService } from './meal-sync.service';
import { BenefitController } from './benefit.controller';
import { MealApplicationController } from './meal-application.controller';

/** Social Benefits: проверка льгот (МТСЗН) и заявления на льготное питание. */
@Module({
  imports: [DocumentsModule],
  controllers: [BenefitController, MealApplicationController],
  providers: [SocialBenefitsService, MealSyncService],
})
export class SocialBenefitsModule {}
