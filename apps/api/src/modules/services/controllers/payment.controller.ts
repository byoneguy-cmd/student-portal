import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Public } from '../../../common/auth/public.decorator';
import { PaymentCallbackDto } from '../dto/payment-callback.dto';
import { ServicesService } from '../services/services.service';

/** Счета и платежи (платёжный шлюз). */
@ApiTags('services / payments')
@Controller('services')
export class PaymentController {
  constructor(private readonly service: ServicesService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список счетов + сводный баланс' })
  @Get('payment-invoices')
  list(@CurrentUser() user: AuthUser) {
    return this.service.listInvoices(user);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить счёт по public_id' })
  @Get('payment-invoices/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getInvoice(user, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Оплатить счёт (Payment PENDING через шлюз)' })
  @Post('payment-invoices/:id/pay')
  pay(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.payInvoice(user, id);
  }

  @Public()
  @ApiOperation({ summary: 'Callback платёжного шлюза (webhook, HMAC-заглушка)' })
  @Post('payments/callback')
  callback(@Body() dto: PaymentCallbackDto) {
    return this.service.handlePaymentCallback(dto);
  }
}
