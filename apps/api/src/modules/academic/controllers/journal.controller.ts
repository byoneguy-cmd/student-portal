import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { JournalService } from '../services/journal.service';
import { TermQueryDto } from '../dto/common.dto';
import { serialize } from '../common/serialize';

/** Журнал: записи на курсы и оценки студента. */
@Controller('academic')
@Roles('STUDENT')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get('enrollments')
  async getEnrollments(
    @CurrentUser('sub') sub: string,
    @Query() query: TermQueryDto,
  ): Promise<unknown[]> {
    const enrollments = await this.journalService.getEnrollments(sub, query.termId);
    return serialize(enrollments);
  }

  @Get('grades')
  async getGrades(
    @CurrentUser('sub') sub: string,
    @Query() query: TermQueryDto,
  ): Promise<Record<string, unknown>> {
    const grades = await this.journalService.getGrades(sub, query.termId);
    return serialize(grades);
  }
}
