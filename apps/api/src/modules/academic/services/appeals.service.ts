import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StudentContextService } from './student-context.service';
import { CreateAppealDto } from '../dto/appeal.dto';

/**
 * Апелляции студента на выставленные оценки.
 */
@Injectable()
export class AppealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentContext: StudentContextService,
  ) {}

  /** Подача апелляции на оценку (только на свою оценку). */
  async create(keycloakSubject: string, dto: CreateAppealDto): Promise<Record<string, unknown>> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);
    const grade = await this.prisma.grade.findUnique({
      where: { id: BigInt(dto.gradeId) },
      include: { enrollment: true },
    });
    if (!grade) throw new NotFoundException('Оценка не найдена');
    if (grade.enrollment.student_user_id !== userId) {
      throw new NotFoundException('Оценка не найдена');
    }

    const appeal = await this.prisma.appeal.create({
      data: {
        grade_id: grade.id,
        student_user_id: userId,
        reason: dto.reason,
        status: 'SUBMITTED',
      },
    });
    return appeal as unknown as Record<string, unknown>;
  }

  /** Список апелляций студента. */
  async list(keycloakSubject: string): Promise<unknown[]> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);
    const appeals = await this.prisma.appeal.findMany({
      where: { student_user_id: userId },
      include: { grade: true },
      orderBy: { created_at: 'desc' },
    });
    return appeals as unknown[];
  }
}
