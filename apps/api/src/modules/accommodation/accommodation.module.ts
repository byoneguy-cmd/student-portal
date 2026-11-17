import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { AccommodationService } from './accommodation.service';
import { DormitoryController } from './dormitory.controller';
import { AccommodationApplicationController } from './accommodation-application.controller';
import { AllocationController } from './allocation.controller';

/** Accommodation: общежития, заявки и распределение мест с учётом льгот. */
@Module({
  imports: [DocumentsModule],
  controllers: [DormitoryController, AccommodationApplicationController, AllocationController],
  providers: [AccommodationService],
})
export class AccommodationModule {}
