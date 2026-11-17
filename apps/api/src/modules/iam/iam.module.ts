import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { ProfileController } from './controllers/profile.controller';
import { AuthService } from './services/auth.service';
import { ProfileService } from './services/profile.service';
import { IinImportService } from './services/iin-import.service';

/**
 * Модуль IAM: аутентификация (eGov Mobile / NCALayer) и профиль пользователя.
 */
@Module({
  controllers: [AuthController, ProfileController],
  providers: [AuthService, ProfileService, IinImportService],
})
export class IamModule {}
