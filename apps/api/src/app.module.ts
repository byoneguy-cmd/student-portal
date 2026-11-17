import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AcademicModule } from './modules/academic/academic.module';
import { AccommodationModule } from './modules/accommodation/accommodation.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { IamModule } from './modules/iam/iam.module';
import { IntegrationHubModule } from './modules/integration-hub/integration-hub.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ServicesModule } from './modules/services/services.module';
import { SocialBenefitsModule } from './modules/social-benefits/social-benefits.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IamModule,
    AcademicModule,
    AccommodationModule,
    SocialBenefitsModule,
    DocumentsModule,
    ServicesModule,
    IntegrationHubModule,
    NotificationModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
