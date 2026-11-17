import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { QuizzesService } from '../services/quizzes.service';
import { SubmitQuizAttemptDto } from '../dto/quiz.dto';
import { TermQueryDto } from '../dto/common.dto';
import { serialize } from '../common/serialize';

/** Тесты (квизы). */
@Controller('academic')
@Roles('STUDENT')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get('quizzes')
  async list(
    @CurrentUser('sub') sub: string,
    @Query() query: TermQueryDto,
  ): Promise<unknown[]> {
    const quizzes = await this.quizzesService.list(sub, query.termId);
    return serialize(quizzes);
  }

  @Post('quizzes/:id/attempts')
  async startAttempt(
    @CurrentUser('sub') sub: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Record<string, unknown>> {
    const attempt = await this.quizzesService.startAttempt(sub, BigInt(id));
    return serialize(attempt);
  }

  @Post('quizzes/attempts/:attemptId/submit')
  async submitAttempt(
    @CurrentUser('sub') sub: string,
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() dto: SubmitQuizAttemptDto,
  ): Promise<Record<string, unknown>> {
    const attempt = await this.quizzesService.submitAttempt(sub, BigInt(attemptId), dto);
    return serialize(attempt);
  }
}
