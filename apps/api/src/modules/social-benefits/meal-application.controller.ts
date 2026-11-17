import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { SocialBenefitsService } from './social-benefits.service';
import { CreateMealApplicationDto } from './dto/create-meal-application.dto';
import { toJson } from './serialize.util';

@Controller('social')
export class MealApplicationController {
  constructor(private readonly social: SocialBenefitsService) {}

  /** POST /social/meal-applications — заявление на льготное питание. */
  @Post('meal-applications')
  async create(
    @CurrentUser('sub') sub: string,
    @Body() dto: CreateMealApplicationDto,
  ): Promise<unknown> {
    return toJson(await this.social.createMealApplication(sub, dto));
  }

  /** GET /social/meal-applications — заявления текущего пользователя. */
  @Get('meal-applications')
  async list(@CurrentUser('sub') sub: string): Promise<unknown> {
    return toJson(await this.social.listMealApplications(sub));
  }

  /** POST /social/meal-applications/:id/submit — отправить на подписание. */
  @Post('meal-applications/:id/submit')
  async submit(@CurrentUser('sub') sub: string, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return toJson(await this.social.submitMealApplication(sub, id));
  }
}
