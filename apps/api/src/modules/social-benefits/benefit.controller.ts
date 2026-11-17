import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { SocialBenefitsService } from './social-benefits.service';
import { CheckEligibilityDto } from './dto/check-eligibility.dto';
import { toJson } from './serialize.util';

@Controller('social')
export class BenefitController {
  constructor(private readonly social: SocialBenefitsService) {}

  /** GET /social/benefit-types — справочник видов льгот. */
  @Get('benefit-types')
  async listTypes(): Promise<unknown> {
    return toJson(await this.social.listBenefitTypes());
  }

  /** GET /social/eligibilities — льготы текущего пользователя. */
  @Get('eligibilities')
  async listEligibilities(@CurrentUser('sub') sub: string): Promise<unknown> {
    return toJson(await this.social.listEligibilities(sub));
  }

  /** POST /social/eligibilities/check — проверка права на льготу (Smart Data / МТСЗН). */
  @Post('eligibilities/check')
  async check(@CurrentUser('sub') sub: string, @Body() dto: CheckEligibilityDto): Promise<unknown> {
    return toJson(await this.social.checkEligibility(sub, dto));
  }
}
