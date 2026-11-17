import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StudentContextService } from './student-context.service';

/**
 * Элективные курсы: список открытых и запись на них (с проверкой capacity).
 */
@Injectable()
export class ElectivesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentContext: StudentContextService,
  ) {}

  /** Список открытых элективов. */
  async list(keycloakSubject: string, termId?: number): Promise<unknown[]> {
    // Резолвим пользователя (проверка существования), хотя список не зависит от него.
    await this.studentContext.resolveUserId(keycloakSubject);

    const electives = await this.prisma.elective.findMany({
      where: {
        status: 'OPEN',
        ...(termId !== undefined ? { term_id: BigInt(termId) } : {}),
      },
      include: {
        course_instance: { include: { course: true } },
        term: true,
      },
      orderBy: { created_at: 'asc' },
    });
    return electives as unknown[];
  }

  /** Запись студента на электив с проверкой свободных мест. */
  async register(keycloakSubject: string, electiveId: bigint): Promise<Record<string, unknown>> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);

    const elective = await this.prisma.elective.findUnique({
      where: { id: electiveId },
      include: { course_instance: true },
    });
    if (!elective) throw new NotFoundException('Электив не найден');
    if (elective.status !== 'OPEN') {
      throw new BadRequestException('Запись на электив закрыта');
    }
    if (elective.max_students !== null && elective.enrolled_count >= elective.max_students) {
      throw new BadRequestException('Нет свободных мест на электив');
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: {
        course_instance_id_student_user_id: {
          course_instance_id: elective.course_instance_id,
          student_user_id: userId,
        },
      },
    });
    if (existing) throw new BadRequestException('Вы уже записаны на этот курс');

    const enrollment = await this.prisma.enrollment.create({
      data: {
        course_instance_id: elective.course_instance_id,
        student_user_id: userId,
        status: 'ACTIVE',
      },
    });

    await this.prisma.elective.update({
      where: { id: electiveId },
      data: { enrolled_count: { increment: 1 } },
    });

    return enrollment as unknown as Record<string, unknown>;
  }
}
