import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationService } from './notification.service';

/** Уведомления (e-mail/SMS/push/in-app). */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список уведомлений текущего пользователя' })
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.listForUser(user);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Пометить уведомление прочитанным' })
  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.markRead(user, id);
  }

  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать уведомление (admin)' })
  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.service.createByDto(dto);
  }
}
