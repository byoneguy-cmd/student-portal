import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StudentContextService } from './student-context.service';
import { GpaService } from './gpa.service';

/**
 * Транскрипт студента: сводная выписка успеваемости и запрос на её формирование.
 */
@Injectable()
export class TranscriptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentContext: StudentContextService,
    private readonly gpaService: GpaService,
  ) {}

  /** Список транскриптов студента с вложенными transcript_items. */
  async list(keycloakSubject: string): Promise<unknown[]> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);
    const transcripts = await this.prisma.transcript.findMany({
      where: { student_user_id: userId },
      include: { transcript_items: true },
      orderBy: { created_at: 'desc' },
    });
    return transcripts as unknown[];
  }

  /** Запрос на формирование транскрипта (создание Transcript в статусе DRAFT). */
  async request(keycloakSubject: string, termId?: number): Promise<Record<string, unknown>> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);
    const gpa = await this.gpaService.compute(userId, termId);

    const transcript = await this.prisma.transcript.create({
      data: {
        student_user_id: userId,
        ...(termId !== undefined ? { term_id: BigInt(termId) } : {}),
        status: 'DRAFT',
        ...(gpa.gpa !== null ? { gpa_total: gpa.gpa } : {}),
        credits_total: gpa.creditsTotal,
      },
      include: { transcript_items: true },
    });
    return transcript as unknown as Record<string, unknown>;
  }
}
