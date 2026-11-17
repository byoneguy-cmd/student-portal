import { createHmac, randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/** Результат генерации challenge для внешнего провайдера. */
export interface ChallengeResult {
  challengeId: string;
  qrData: string;
  expiresAt: string;
}

/** Данные, необходимые для upsert пользователя после авторизации. */
export interface UpsertUserInput {
  iin?: string;
  iinToken?: string;
  keycloakSubject?: string;
  email?: string;
  phone?: string;
  /** Провайдер внешней учётной записи (enum IdentityProvider). */
  provider?: 'EGOV_MOBILE' | 'NCALAYER';
  /** Внешний subject (например, `EGOV_MOBILE:<iinToken>`). */
  subject?: string;
  certificateSerial?: string;
  certificateIssuer?: string;
}

/**
 * Сервис аутентификации: генерация challenge и реальный upsert пользователя.
 * Реальная интеграция с eGov Mobile / NCALayer помечена TODO (здесь заглушка).
 */
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Генерация одноразового challenge для внешнего провайдера.
   * TODO: реальная интеграция с eGov Mobile / NCALayer (подпись challenge).
   */
  initChallenge(provider: 'EGOV_MOBILE' | 'NCALAYER'): ChallengeResult {
    const challengeId = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // +5 минут
    return {
      challengeId,
      qrData: JSON.stringify({ provider, challengeId, expiresAt: expiresAt.toISOString() }),
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Завершение авторизации: верификация (заглушка), извлечение ИИН,
   * upsert пользователя и связывание внешней учётной записи.
   */
  async completeChallenge(input: UpsertUserInput): Promise<Record<string, unknown>> {
    // TODO: реальная верификация challenge и извлечение ИИН из ответа eGov/NCALayer.
    if (!input.iin) {
      throw new BadRequestException('Не удалось извлечь ИИН из ответа провайдера');
    }

    const iinToken = this.hashIin(input.iin);
    const subject = input.subject ?? `${input.provider ?? 'EGOV_MOBILE'}:${iinToken}`;

    const user = await this.upsertUser({ ...input, iinToken, subject });

    const profile = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { user_profile: true, user_roles: true, user_identities: true },
    });
    if (!profile) throw new NotFoundException('Пользователь не найден после создания');

    return profile as unknown as Record<string, unknown>;
  }

  /**
   * Реальный upsert пользователя: поиск по iin_token/keycloak_subject, иначе создание
   * с вложенными user_roles, user_profiles и связывание user_identities.
   */
  async upsertUser(data: UpsertUserInput): Promise<{ id: bigint }> {
    const existingByIin = data.iinToken
      ? await this.prisma.user.findUnique({ where: { iin_token: data.iinToken } })
      : null;
    const existingBySubject =
      !existingByIin && data.keycloakSubject
        ? await this.prisma.user.findUnique({ where: { keycloak_subject: data.keycloakSubject } })
        : null;
    const existing = existingByIin ?? existingBySubject;

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            // TODO: ИИН должен храниться как шифротекст AES-256-GCM.
            ...(data.iin ? { iin: data.iin } : {}),
            ...(data.iinToken ? { iin_token: data.iinToken } : {}),
            ...(data.email ? { email: data.email } : {}),
            ...(data.phone ? { phone: data.phone } : {}),
            last_login_at: new Date(),
          },
        })
      : await this.prisma.user.create({
          data: {
            iin: data.iin,
            iin_token: data.iinToken,
            email: data.email,
            phone: data.phone,
            keycloak_subject: data.keycloakSubject,
            status: 'ACTIVE',
            user_roles: { create: [{ role: 'STUDENT' }] },
            user_profile: { create: {} },
          },
        });

    // Связывание внешней учётной записи (user_identities).
    if (data.provider && data.subject) {
      await this.prisma.userIdentity.upsert({
        where: { provider_subject: { provider: data.provider, subject: data.subject } },
        update: {
          status: 'LINKED',
          last_used_at: new Date(),
          ...(data.certificateSerial ? { certificate_serial: data.certificateSerial } : {}),
          ...(data.certificateIssuer ? { certificate_issuer: data.certificateIssuer } : {}),
        },
        create: {
          user_id: user.id,
          provider: data.provider,
          subject: data.subject,
          status: 'LINKED',
          certificate_serial: data.certificateSerial,
          certificate_issuer: data.certificateIssuer,
        },
      });
    }

    // Гарантируем наличие роли STUDENT (идемпотентно).
    await this.prisma.userRole.upsert({
      where: { user_id_role: { user_id: user.id, role: 'STUDENT' } },
      update: {},
      create: { user_id: user.id, role: 'STUDENT' },
    });

    return user;
  }

  /**
   * Профиль текущего пользователя из БД по keycloakSubject.
   */
  async me(keycloakSubject: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { keycloak_subject: keycloakSubject },
      include: { user_profile: true, user_roles: true, user_identities: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user as unknown as Record<string, unknown>;
  }

  /** iin_token = HMAC-SHA256(ИИН) — 64 шестнадцатеричных символа (Char(64)). */
  private hashIin(iin: string): string {
    const secret = process.env.IIN_TOKEN_SECRET ?? 'student-portal-dev-secret';
    return createHmac('sha256', secret).update(iin).digest('hex');
  }
}
