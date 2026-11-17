import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StudentContextService } from './student-context.service';
import { SubmitQuizAttemptDto } from '../dto/quiz.dto';

/**
 * Тесты (квизы) по курсам студента: начало и сдача попыток.
 */
@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentContext: StudentContextService,
  ) {}

  /** Список опубликованных тестов по курсам студента. */
  async list(keycloakSubject: string, termId?: number): Promise<unknown[]> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);
    const courseInstanceIds = await this.studentContext.getEnrolledCourseInstanceIds(userId, termId);

    const quizzes = await this.prisma.quiz.findMany({
      where: { course_instance_id: { in: courseInstanceIds }, status: 'PUBLISHED' },
      include: { course_instance: { include: { course: true } } },
      orderBy: { opens_at: 'asc' },
    });
    return quizzes as unknown[];
  }

  /** Начало новой попытки прохождения теста. */
  async startAttempt(keycloakSubject: string, quizId: bigint): Promise<Record<string, unknown>> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);

    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.status !== 'PUBLISHED') throw new NotFoundException('Тест не найден');
    await this.ensureEnrolled(userId, quiz.course_instance_id);

    const lastAttempts = await this.prisma.quizAttempt.findMany({
      where: { quiz_id: quiz.id, student_user_id: userId },
      orderBy: { attempt_number: 'desc' },
      take: 1,
    });
    const nextNumber = lastAttempts[0] ? lastAttempts[0].attempt_number + 1 : 1;

    if (quiz.max_attempts !== null && nextNumber > quiz.max_attempts) {
      throw new BadRequestException('Превышено допустимое число попыток');
    }

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quiz_id: quiz.id,
        student_user_id: userId,
        attempt_number: nextNumber,
        status: 'IN_PROGRESS',
      },
    });
    return attempt as unknown as Record<string, unknown>;
  }

  /** Сдача попытки теста: сохранение ответов и пометка SUBMITTED. */
  async submitAttempt(
    keycloakSubject: string,
    attemptId: bigint,
    dto: SubmitQuizAttemptDto,
  ): Promise<Record<string, unknown>> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);

    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { quiz_questions: true } } },
    });
    if (!attempt) throw new NotFoundException('Попытка не найдена');
    if (attempt.student_user_id !== userId) throw new NotFoundException('Попытка не найдена');
    if (attempt.status === 'SUBMITTED' || attempt.status === 'GRADED') {
      throw new BadRequestException('Попытка уже завершена');
    }

    // Сохранение ответов (автопроверка is_correct — TODO).
    if (dto.answers && dto.answers.length > 0) {
      for (const answer of dto.answers) {
        await this.prisma.quizAnswer.create({
          data: {
            attempt_id: attempt.id,
            question_id: BigInt(answer.questionId),
            answer: (answer.answer ?? {}) as any,
            is_correct: null,
            points_awarded: null,
          },
        });
      }
    }

    const maxScore = attempt.quiz.quiz_questions.reduce(
      (sum, question) => sum + Number(question.points ?? 0),
      0,
    );

    // TODO: автоматическая проверка ответов и расчёт score.
    const updated = await this.prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { status: 'SUBMITTED', submitted_at: new Date(), max_score: maxScore },
    });
    return updated as unknown as Record<string, unknown>;
  }

  /** Проверка, что студент записан на курс теста. */
  private async ensureEnrolled(userId: bigint, courseInstanceId: bigint): Promise<void> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        course_instance_id_student_user_id: {
          course_instance_id: courseInstanceId,
          student_user_id: userId,
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Вы не записаны на этот курс');
  }
}
