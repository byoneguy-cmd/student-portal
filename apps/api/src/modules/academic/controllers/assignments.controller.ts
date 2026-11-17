import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { AssignmentsService } from '../services/assignments.service';
import { CreateSubmissionDto } from '../dto/assignment.dto';
import { TermQueryDto } from '../dto/common.dto';
import { serialize } from '../common/serialize';

/** Домашние задания. */
@Controller('academic')
@Roles('STUDENT')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('assignments')
  async list(
    @CurrentUser('sub') sub: string,
    @Query() query: TermQueryDto,
  ): Promise<unknown[]> {
    const assignments = await this.assignmentsService.list(sub, query.termId);
    return serialize(assignments);
  }

  @Get('assignments/:id')
  async getOne(
    @CurrentUser('sub') sub: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Record<string, unknown>> {
    const assignment = await this.assignmentsService.getOne(sub, BigInt(id));
    return serialize(assignment);
  }

  @Post('assignments/:id/submissions')
  async submit(
    @CurrentUser('sub') sub: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSubmissionDto,
  ): Promise<Record<string, unknown>> {
    const submission = await this.assignmentsService.submit(sub, BigInt(id), dto);
    return serialize(submission);
  }
}
