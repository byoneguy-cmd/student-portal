import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/** Тип результата расчёта успеваемости (type, чтобы был присваиваем к Record<string, unknown>). */
export type GpaResult = {
  /** Итоговый GPA (0–4) или null, если нечего считать. */
  gpa: number | null;
  creditsTotal: number;
  rows: Array<Record<string, unknown>>;
}

/**
 * Расчёт GPA: сумма(value * credits) / сумма(credits).
 * value — итоговые баллы (gpa_points) либо взвешенная оценка по GradeComponent.weight.
 */
@Injectable()
export class GpaService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(userId: bigint, termId?: number): Promise<GpaResult> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        student_user_id: userId,
        status: 'ACTIVE',
        ...(termId !== undefined ? { course_instance: { is: { term_id: BigInt(termId) } } } : {}),
      },
      include: {
        course_instance: {
          include: { course: true, grade_components: true },
        },
        grades: { include: { grade_component: true } },
      },
      orderBy: { enrolled_at: 'asc' },
    });

    const rows: Array<Record<string, unknown>> = [];
    let weightedSum = 0;
    let creditsSum = 0;

    for (const en of enrollments) {
      const credits = Number(en.course_instance.course.credits_ects ?? 0);
      const value = this.effectiveGpa(en);

      rows.push({
        enrollment_id: en.id,
        course_code: en.course_instance.course.code,
        course_name: en.course_instance.course.name_ru,
        section: en.course_instance.section,
        credits_ects: credits,
        gpa_points: value,
        grades: en.grades,
      });

      if (value !== null && credits > 0) {
        weightedSum += value * credits;
        creditsSum += credits;
      }
    }

    const gpa = creditsSum > 0 ? Number((weightedSum / creditsSum).toFixed(3)) : null;
    return { gpa, creditsTotal: creditsSum, rows };
  }

  /**
   * Итоговое значение (0–4) по записи на курс:
   * итоговая оценка (grade_component_id = null) → gpa_points;
   * иначе — взвешенная по GradeComponent.weight сумма процентов.
   */
  private effectiveGpa(en: {
    course_instance: {
      grade_components: Array<{ id: bigint; weight: unknown }>;
    };
    grades: Array<{ grade_component_id: bigint | null; gpa_points: unknown; percentage: unknown }>;
  }): number | null {
    const final = en.grades.find((g) => g.grade_component_id === null);
    if (final && final.gpa_points !== null) {
      return Number(final.gpa_points);
    }

    const components = en.course_instance.grade_components;
    const compGrades = en.grades.filter((g) => g.grade_component_id !== null);
    if (components.length > 0 && compGrades.length > 0) {
      let weightedPoints = 0;
      let weightSum = 0;
      for (const component of components) {
        const grade = compGrades.find((g) => g.grade_component_id === component.id);
        const pct = grade ? Number(grade.percentage ?? 0) : 0;
        const weight = Number(component.weight ?? 0);
        weightedPoints += pct * weight;
        weightSum += weight;
      }
      const totalPercent = weightSum > 0 ? weightedPoints / weightSum : 0;
      return this.percentageToGpa(totalPercent);
    }

    return null;
  }

  /** Перевод процента в 4-балльную шкалу. */
  private percentageToGpa(percent: number): number {
    if (percent >= 95) return 4.0;
    if (percent >= 90) return 3.67;
    if (percent >= 85) return 3.33;
    if (percent >= 80) return 3.0;
    if (percent >= 75) return 2.67;
    if (percent >= 70) return 2.33;
    if (percent >= 65) return 2.0;
    if (percent >= 60) return 1.67;
    if (percent >= 55) return 1.33;
    if (percent >= 50) return 1.0;
    return 0;
  }
}
