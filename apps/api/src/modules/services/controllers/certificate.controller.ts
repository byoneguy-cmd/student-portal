import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { CreateCertificateDto } from '../dto/create-certificate.dto';
import { ServicesService } from '../services/services.service';

/** Справки (серверная ЭЦП вуза). */
@ApiTags('services / certificates')
@ApiBearerAuth()
@Controller('services')
export class CertificateController {
  constructor(private readonly service: ServicesService) {}

  @ApiOperation({ summary: 'Список справок текущего пользователя' })
  @Get('certificates')
  list(@CurrentUser() user: AuthUser) {
    return this.service.listCertificates(user);
  }

  @ApiOperation({ summary: 'Запросить справку (Certificate REQUESTED + Document DRAFT)' })
  @Post('certificates')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCertificateDto) {
    return this.service.createCertificate(user, dto);
  }

  @ApiOperation({ summary: 'Получить справку по public_id' })
  @Get('certificates/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getCertificate(user, id);
  }

  @ApiOperation({ summary: 'Скачать справку (заглушка MinIO)' })
  @Get('certificates/:id/download')
  download(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.downloadCertificate(user, id);
  }
}
