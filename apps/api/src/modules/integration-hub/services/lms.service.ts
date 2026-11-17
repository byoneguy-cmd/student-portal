import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ScheduleEntryType, Weekday } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  LmsEnrollmentPayload,
  LmsEnrollmentResult,
  LmsGradeSyncPayload,
  LmsGradeSyncResult,
  LmsScheduleEntry,
  LmsScheduleSyncPayload,
  LmsSyncResult,
} from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Адаптер LMS (Platonus / 1С:Университет). Гибридный режим:
 * poll (incremental по cursor) + webhook (push). Обе ветки нормализуют payload
 * в единую внутреннюю модель Academic и upsert'ят данные в схему acad.
 * LMS — мастер по оценкам/расписанию; НОБД — по зачислению (ADR, открытый вопрос №2).
 */
@Injectable()
export class LmsService {
  private readonly logger = new Logger(LmsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Синхронизация расписания (нормализация + вставка/обновление acad.*). */
  async syncSchedule(payload: LmsScheduleSyncPayload): Promise<LmsSyncResult> {
    this.logger.log(`LMS syncSchedule (term=${payload.term}, entries=${payload.entries.length})`);
    const term = await this.ensureTerm(payload.term);
    let scheduleId = '';
    let count = 0;

    for (const entry of payload.entries) {
      const course = await this.ensureCourse(entry.subjectCode, entry.subjectName);
      const instance = await this.ensureCourseInstance(course.id, term.id, payload.group ?? 'A');

      let schedule = await this.prisma.schedule.findFirst({
        where: { course_instance_id: instance.id, term_id: term.id },
      });
      if (!schedule) {
        schedule = await this.prisma.schedule.create({
          data: {
            course_instance_id: instance.id,
            term_id: term.id,
            title: course.name_ru,
            is_published: false,
          },
        });
      }
      scheduleId = schedule.public_id;

      await this.prisma.scheduleEntry.create({
        data: {
          schedule_id: schedule.id,
          weekday: this.weekdayOf(entry.startAt),
          start_time: new Date(entry.startAt),
          end_time: new Date(entry.endAt),
          entry_type: this.entryTypeOf(entry.type),
          location: entry.room,
          recurrence: {},
        },
      });
      count++;
    }

    return { scheduleId, entries: count };
  }

  /** Синхронизация оценок (upsert enrollment + Grade). */
  async syncGrades(payload: LmsGradeSyncPayload): Promise<LmsGradeSyncResult> {
    this.logger.log(`LMS syncGrades (term=${payload.term}, entries=${payload.entries.length})`);
    const term = await this.ensureTerm(payload.term);
    const studentId = await this.resolveStudent(payload.studentId);
    let count = 0;

    for (const entry of payload.entries) {
      const course = await this.ensureCourse(entry.subjectCode, entry.subjectCode);
      const instance = await this.ensureCourseInstance(course.id, term.id, 'A');
      const enrollment = await this.ensureEnrollment(instance.id, studentId);

      await this.prisma.grade.create({
        data: {
          enrollment_id: enrollment.id,
          points: entry.grade,
          max_points: 100,
          percentage: entry.grade,
          letter_grade: this.letterGrade(entry.grade),
          status: 'SUBMITTED',
          external_lms_id: entry.externalId,
        },
      });
      count++;
    }

    return { grades: count };
  }

  /** Импорт зачисления (enrollment) студента. */
  async importEnrollment(payload: LmsEnrollmentPayload): Promise<LmsEnrollmentResult> {
    this.logger.log(`LMS importEnrollment (term=${payload.term}, student=${payload.studentId})`);
    const term = await this.ensureTerm(payload.term);
    const studentId = await this.resolveStudent(payload.studentId);
    const course = await this.ensureCourse(
      payload.specialtyCode ?? 'PROGRAM',
      payload.specialtyName ?? 'Образовательная программа',
    );
    const instance = await this.ensureCourseInstance(course.id, term.id, payload.group ?? 'A');
    const enrollment = await this.ensureEnrollment(instance.id, studentId);

    return { enrollmentId: enrollment.public_id };
  }

  /** Upsert учебного периода по коду. */
  private async ensureTerm(code: string) {
    return this.prisma.academicTerm.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name_ru: code,
        name_kz: code,
        term_type: 'SEMESTER',
        academic_year: '2026-2027',
        starts_on: new Date('2026-09-01T00:00:00.000Z'),
        ends_on: new Date('2026-12-31T00:00:00.000Z'),
        is_current: false,
      },
    });
  }

  /** Upsert справочника дисциплины по коду. */
  private async ensureCourse(code: string, name?: string) {
    const nameRu = name || code;
    return this.prisma.course.upsert({
      where: { code },
      update: { name_ru: nameRu, name_kz: nameRu },
      create: { code, name_ru: nameRu, name_kz: nameRu },
    });
  }

  /** Upsert реализации дисциплины (поток/секция) по уникальному ключу. */
  private async ensureCourseInstance(courseId: bigint, termId: bigint, section: string) {
    return this.prisma.courseInstance.upsert({
      where: { course_id_term_id_section: { course_id: courseId, term_id: termId, section } },
      update: {},
      create: { course_id: courseId, term_id: termId, section, is_elective: false },
    });
  }

  /** Upsert записи студента на курс. */
  private async ensureEnrollment(courseInstanceId: bigint, studentUserId: bigint) {
    const existing = await this.prisma.enrollment.findUnique({
      where: {
        course_instance_id_student_user_id: {
          course_instance_id: courseInstanceId,
          student_user_id: studentUserId,
        },
      },
    });
    if (existing) {
      return this.prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      });
    }
    return this.prisma.enrollment.create({
      data: { course_instance_id: courseInstanceId, student_user_id: studentUserId, status: 'ACTIVE' },
    });
  }

  /** Разрешение студента по внешнему идентификатору LMS. */
  private async resolveStudent(studentId: string): Promise<bigint> {
    if (/^\d+$/.test(studentId)) {
      return BigInt(studentId);
    }
    if (UUID_RE.test(studentId)) {
      const user = await this.prisma.user.findFirst({
        where: { keycloak_subject: studentId },
        select: { id: true },
      });
      if (user) {
        return user.id;
      }
    }
    // Заглушка для локальной разработки: берём первого пользователя.
    const anyUser = await this.prisma.user.findFirst({ select: { id: true }, orderBy: { id: 'asc' } });
    if (anyUser) {
      return anyUser.id;
    }
    throw new BadRequestException(`Студент не найден: ${studentId}`);
  }

  private weekdayOf(iso: string): Weekday {
    const day = new Date(iso).getDay(); // 0 = воскресенье
    const table: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return table[day] ?? 'MON';
  }

  private entryTypeOf(type: string): ScheduleEntryType {
    const normalized = String(type ?? '').toUpperCase();
    if (['LECTURE', 'PRACTICE', 'LAB', 'SEMINAR', 'EXAM'].includes(normalized)) {
      return normalized as ScheduleEntryType;
    }
    return 'CONSULTATION';
  }

  private letterGrade(grade: number): string {
    if (grade >= 90) return 'A';
    if (grade >= 85) return 'A-';
    if (grade >= 80) return 'B+';
    if (grade >= 75) return 'B';
    if (grade >= 70) return 'B-';
    if (grade >= 65) return 'C+';
    if (grade >= 60) return 'C';
    if (grade >= 55) return 'C-';
    if (grade >= 50) return 'D';
    return 'F';
  }
}
