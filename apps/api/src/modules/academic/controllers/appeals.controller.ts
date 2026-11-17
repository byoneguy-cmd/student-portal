import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { AppealsService } from '../services/appeals.service';
import { CreateAppealDto } from '../dto/appeal.dto';
import { serialize } from '../common/serialize';

/** Апелляции студента на оценки. */
@Controller('academic')
@Roles('STUDENT')
export class AppealsController {
  constructor(private readonly appealsService: AppealsService) {}

  @Post('appeals')
  async create(
    @CurrentUser('sub') sub: string,
    @Body() dto: CreateAppealDto,
  ): Promise<Record<string, unknown>> {
    const appeal = await this.appealsService.create(sub, dto);
    return serialize(appeal);
  }

  @Get('appeals')
  async list(@CurrentUser('sub') sub: string): Promise<unknown[]> {
    const appeals = await this.appealsService.list(sub);
    return serialize(appeals);
  }
}
