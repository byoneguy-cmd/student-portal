import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { ScheduleService } from '../services/schedule.service';
import { ScheduleQueryDto } from '../dto/common.dto';
import { serialize } from '../common/serialize';

/** Расписание занятий студента. */
@Controller('academic')
@Roles('STUDENT')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('schedule')
  async getSchedule(
    @CurrentUser('sub') sub: string,
    @Query() query: ScheduleQueryDto,
  ): Promise<Array<Record<string, unknown>>> {
    const schedule = await this.scheduleService.getSchedule(sub, query.termId, query.week);
    return serialize(schedule);
  }
}
