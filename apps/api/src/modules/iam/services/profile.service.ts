import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IinImportService } from './iin-import.service';
import { UpdateProfileDto, ImportSourceValue } from '../dto/profile.dto';

/**
 * Сервис профиля: чтение/обновление user_profiles, журнал импортов
 * и запуск импорта данных по ИИН.
 */
@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly iinImport: IinImportService,
  ) {}

  /** Профиль текущего пользователя (users + user_profiles). */
  async getProfile(keycloakSubject: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { keycloak_subject: keycloakSubject },
      include: { user_profile: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user as unknown as Record<string, unknown>;
  }

  /** Upsert user_profiles для текущего пользователя. */
  async updateProfile(
    keycloakSubject: string,
    dto: UpdateProfileDto,
  ): Promise<Record<string, unknown>> {
    const userId = await this.resolveUserId(keycloakSubject);
    const data = this.toProfileData(dto);

    // Пустое обновление: не вызываем upsert с пустым update (Prisma требует поле).
    if (Object.keys(data).length === 0) {
      const existing = await this.prisma.userProfile.findUnique({ where: { user_id: userId } });
      if (existing) return existing as unknown as Record<string, unknown>;
      const created = await this.prisma.userProfile.create({ data: { user_id: userId } });
      return created as unknown as Record<string, unknown>;
    }

    // Json-поля (emergency_contact/extra) и смешанные типы — приводим к типу данных Prisma.
    const profile = await this.prisma.userProfile.upsert({
      where: { user_id: userId },
      update: data as any,
      create: { user_id: userId, ...data } as any,
    });
    return profile as unknown as Record<string, unknown>;
  }

  /** Журнал импортов текущего пользователя (external_data_imports). */
  async getImports(keycloakSubject: string): Promise<unknown[]> {
    const userId = await this.resolveUserId(keycloakSubject);
    const imports = await this.prisma.externalDataImport.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return imports as unknown[];
  }

  /**
   * Запуск импорта: создание ExternalDataImport (PENDING), вызов IinImportService,
   * обновление статуса (COMPLETED/FAILED).
   */
  async importData(keycloakSubject: string, source: ImportSourceValue): Promise<Record<string, unknown>> {
    const userId = await this.resolveUserId(keycloakSubject);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.iin_token) {
      throw new BadRequestException('У пользователя отсутствует привязанный ИИН (iin_token)');
    }

    const record = await this.prisma.externalDataImport.create({
      data: {
        user_id: userId,
        iin_token: user.iin_token,
        source,
        status: 'PENDING',
        started_at: new Date(),
      },
    });

    try {
      const payload = await this.iinImport.fetch(user.iin_token, source);
      const updated = await this.prisma.externalDataImport.update({
        where: { id: record.id },
        data: { status: 'COMPLETED', payload: payload as any, completed_at: new Date() },
      });
      return updated as unknown as Record<string, unknown>;
    } catch (error) {
      const failed = await this.prisma.externalDataImport.update({
        where: { id: record.id },
        data: {
          status: 'FAILED',
          error_message: (error as Error).message,
          completed_at: new Date(),
        },
      });
      return failed as unknown as Record<string, unknown>;
    }
  }

  /** Резолв id пользователя по keycloakSubject. */
  private async resolveUserId(keycloakSubject: string): Promise<bigint> {
    const user = await this.prisma.user.findUnique({ where: { keycloak_subject: keycloakSubject } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user.id;
  }

  /** Преобразование DTO в данные для user_profiles (только переданные поля). */
  private toProfileData(dto: UpdateProfileDto): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    const stringFields: Array<[keyof UpdateProfileDto, string]> = [
      ['first_name', 'first_name'],
      ['last_name', 'last_name'],
      ['middle_name', 'middle_name'],
      ['iin_short', 'iin_short'],
      ['gender', 'gender'],
      ['nationality', 'nationality'],
      ['citizenship', 'citizenship'],
      ['home_address', 'home_address'],
      ['registration_address', 'registration_address'],
      ['document_type', 'document_type'],
      ['document_number', 'document_number'],
    ];
    for (const [key, dbKey] of stringFields) {
      const value = dto[key];
      if (typeof value === 'string') data[dbKey] = value;
    }
    if (dto.birth_date) data.birth_date = new Date(dto.birth_date);
    if (dto.document_issue_date) data.document_issue_date = new Date(dto.document_issue_date);
    if (dto.emergency_contact !== undefined) data.emergency_contact = dto.emergency_contact;
    if (dto.extra !== undefined) data.extra = dto.extra;
    return data;
  }
}
