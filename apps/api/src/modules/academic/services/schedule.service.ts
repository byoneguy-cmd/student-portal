import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StudentContextService } from './student-context.service';

/**
 * Расписание студента: enrollments → course_instances → schedules → schedule_entries.
 */
@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentContext: StudentContextService,
  ) {}

  async getSchedule(
    keycloakSubject: string,
    termId?: number,
    week?: number,
  ): Promise<Array<Record<string, unknown>>> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        student_user_id: userId,
        status: 'ACTIVE',
        ...(termId !== undefined ? { course_instance: { is: { term_id: BigInt(termId) } } } : {}),
      },
      include: {
        course_instance: {
          include: {
            course: true,
            schedules: {
              where: {
                is_published: true,
                ...(termId !== undefined ? { term_id: BigInt(termId) } : {}),
              },
              include: {
                schedule_entries: { orderBy: { start_time: 'asc' } },
              },
            },
          },
        },
      },
    });

    const result: Array<Record<string, unknown>> = [];
    for (const enrollment of enrollments) {
      const instance = enrollment.course_instance;
      for (const schedule of instance.schedules) {
        for (const entry of schedule.schedule_entries) {
          if (week !== undefined && !this.matchesWeek(entry, week)) continue;
          result.push({
            enrollment_id: enrollment.id,
            course_code: instance.course.code,
            course_name: instance.course.name_ru,
            section: instance.section,
            schedule_id: schedule.id,
            schedule_title: schedule.title,
            entry,
          });
        }
      }
    }
    return result;
  }

  /** Проверка принадлежности занятия неделе (по полю recurrence JSON). */
  private matchesWeek(entry: { recurrence?: unknown }, week: number): boolean {
    const recurrence = (entry.recurrence ?? {}) as Record<string, unknown>;
    if (Array.isArray(recurrence.weeks)) {
      return recurrence.weeks.includes(week);
    }
    if (typeof recurrence.week === 'number') {
      return recurrence.week === week;
    }
    return true; // неделя не указана — показываем занятие
  }
}
