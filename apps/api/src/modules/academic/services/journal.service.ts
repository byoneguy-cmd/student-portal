import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StudentContextService } from './student-context.service';
import { GpaService, GpaResult } from './gpa.service';

/**
 * Журнал: записи студента на курсы и оценки (с расчётом GPA).
 */
@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentContext: StudentContextService,
    private readonly gpaService: GpaService,
  ) {}

  /** Записи студента на курсы (enrollments). */
  async getEnrollments(keycloakSubject: string, termId?: number): Promise<unknown[]> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        student_user_id: userId,
        status: 'ACTIVE',
        ...(termId !== undefined ? { course_instance: { is: { term_id: BigInt(termId) } } } : {}),
      },
      include: {
        course_instance: { include: { course: true, term: true } },
      },
      orderBy: { enrolled_at: 'desc' },
    });
    return enrollments as unknown[];
  }

  /** Оценки студента + итоговый GPA. */
  async getGrades(keycloakSubject: string, termId?: number): Promise<GpaResult> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);
    return this.gpaService.compute(userId, termId);
  }
}
