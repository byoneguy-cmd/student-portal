import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Общий контекст студента: резолв id пользователя по keycloakSubject
 * и получение записей на курсы (enrollments) текущего студента.
 */
@Injectable()
export class StudentContextService {
  constructor(private readonly prisma: PrismaService) {}

  /** Резолв id пользователя по keycloakSubject. */
  async resolveUserId(keycloakSubject: string): Promise<bigint> {
    const user = await this.prisma.user.findUnique({ where: { keycloak_subject: keycloakSubject } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user.id;
  }

  /** Идентификаторы course_instances, на которые записан студент. */
  async getEnrolledCourseInstanceIds(userId: bigint, termId?: number): Promise<bigint[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        student_user_id: userId,
        status: 'ACTIVE',
        ...(termId !== undefined ? { course_instance: { is: { term_id: BigInt(termId) } } } : {}),
      },
      select: { course_instance_id: true },
    });
    return enrollments.map((e) => e.course_instance_id);
  }
}
