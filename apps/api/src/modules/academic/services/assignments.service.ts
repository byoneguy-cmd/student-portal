import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StudentContextService } from './student-context.service';
import { CreateSubmissionDto } from '../dto/assignment.dto';

/**
 * Домашние задания по курсам студента и сдача работ.
 */
@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentContext: StudentContextService,
  ) {}

  /** Список опубликованных заданий по курсам, на которые записан студент. */
  async list(keycloakSubject: string, termId?: number): Promise<unknown[]> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);
    const courseInstanceIds = await this.studentContext.getEnrolledCourseInstanceIds(userId, termId);

    const assignments = await this.prisma.assignment.findMany({
      where: { course_instance_id: { in: courseInstanceIds }, is_published: true },
      include: { course_instance: { include: { course: true } } },
      orderBy: { due_at: 'asc' },
    });
    return assignments as unknown[];
  }

  /** Детали задания + сдача текущего студента. */
  async getOne(keycloakSubject: string, assignmentId: bigint): Promise<Record<string, unknown>> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course_instance: { include: { course: true } } },
    });
    if (!assignment) throw new NotFoundException('Задание не найдено');
    await this.ensureEnrolled(userId, assignment.course_instance_id);

    const submission = await this.prisma.submission.findUnique({
      where: {
        assignment_id_student_user_id: { assignment_id: assignment.id, student_user_id: userId },
      },
    });

    return { ...assignment, my_submission: submission } as unknown as Record<string, unknown>;
  }

  /** Сдача задания (upsert по assignment_id + student_user_id). */
  async submit(
    keycloakSubject: string,
    assignmentId: bigint,
    dto: CreateSubmissionDto,
  ): Promise<Record<string, unknown>> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);

    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Задание не найдено');
    await this.ensureEnrolled(userId, assignment.course_instance_id);

    const submission = await this.prisma.submission.upsert({
      where: {
        assignment_id_student_user_id: { assignment_id: assignment.id, student_user_id: userId },
      },
      update: {
        status: 'SUBMITTED',
        submitted_at: new Date(),
        files: (dto.files ?? []) as any,
      },
      create: {
        assignment_id: assignment.id,
        student_user_id: userId,
        status: 'SUBMITTED',
        submitted_at: new Date(),
        files: (dto.files ?? []) as any,
      },
    });
    return submission as unknown as Record<string, unknown>;
  }

  /** Проверка, что студент записан на курс задания. */
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
