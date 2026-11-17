import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { SignatureService } from '../documents/signature.service';
import { MealSyncService } from './meal-sync.service';
import type { CheckEligibilityDto } from './dto/check-eligibility.dto';
import type { CreateMealApplicationDto } from './dto/create-meal-application.dto';

@Injectable()
export class SocialBenefitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly signatures: SignatureService,
    private readonly mealSync: MealSyncService,
  ) {}

  /** Резолвит числовой id пользователя по keycloak subject. */
  private async resolveUserId(sub: string): Promise<bigint> {
    const user = await this.prisma.user.findUnique({ where: { keycloak_subject: sub } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user.id;
  }

  async listBenefitTypes(): Promise<unknown> {
    return this.prisma.socialBenefitType.findMany({
      where: { is_active: true },
      orderBy: { code: 'asc' },
    });
  }

  async listEligibilities(sub: string): Promise<unknown> {
    const userId = await this.resolveUserId(sub);
    return this.prisma.socialBenefitEligibility.findMany({
      where: { user_id: userId },
      include: { benefit_type: true },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Проверка права на льготу: заглушка запроса в Smart Data Ukimet / МТСЗН.
   * TODO: реальный запрос через Integration Hub; здесь право считается подтверждённым на 1 год.
   */
  async checkEligibility(sub: string, dto: CheckEligibilityDto): Promise<unknown> {
    const userId = await this.resolveUserId(sub);

    const benefitType = await this.prisma.socialBenefitType.findUnique({
      where: { code: dto.benefitTypeCode },
    });
    if (!benefitType) throw new NotFoundException('Вид льготы не найден');

    const now = new Date();
    const validTo = new Date(now);
    validTo.setFullYear(validTo.getFullYear() + 1);

    return this.prisma.socialBenefitEligibility.create({
      data: {
        user_id: userId,
        benefit_type_id: benefitType.id,
        status: 'ACTIVE',
        valid_from: now,
        valid_to: validTo,
        verified_at: now,
      },
    });
  }

  /** Создание заявления на льготное питание (требует ACTIVE eligibility). */
  async createMealApplication(sub: string, dto: CreateMealApplicationDto): Promise<unknown> {
    const userId = await this.resolveUserId(sub);

    const eligibility = await this.findActiveEligibility(userId, null);
    if (!eligibility) {
      throw new BadRequestException('Отсутствует активная льгота (eligibility ACTIVE)');
    }

    return this.prisma.mealApplication.create({
      data: {
        user_id: userId,
        eligibility_id: eligibility.id,
        status: 'DRAFT',
        meal_period: dto.mealPeriod ?? 'ALL_DAY',
        valid_from: dto.validFrom ? new Date(dto.validFrom) : null,
        valid_to: dto.validTo ? new Date(dto.validTo) : null,
      },
    });
  }

  async listMealApplications(sub: string): Promise<unknown> {
    const userId = await this.resolveUserId(sub);
    return this.prisma.mealApplication.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  /** Отправка заявления: SUBMITTED + подписание через DocumentsService + outbox в столовую. */
  async submitMealApplication(sub: string, id: number): Promise<unknown> {
    const userId = await this.resolveUserId(sub);

    const meal = await this.prisma.mealApplication.findUnique({ where: { id: BigInt(id) } });
    if (!meal || meal.user_id !== userId) throw new NotFoundException('Заявление не найдено');
    if (meal.status === 'SUBMITTED') throw new BadRequestException('Заявление уже отправлено');

    const eligibility = await this.findActiveEligibility(userId, meal.eligibility_id);
    if (!eligibility) throw new BadRequestException('Активная льгота не подтверждена');

    // Подписание заявления через DocumentsService: документ-заявление + DocumentSignature PENDING.
    const document = await this.documents.createDocument({
      ownerUserId: userId,
      docType: 'APPLICATION',
      title: 'Заявление на льготное питание',
      metadata: { mealApplicationId: String(meal.id), mealPeriod: meal.meal_period },
    });
    const signature = await this.signatures.initBatchSign({
      documentId: document.id,
      signerUserId: userId,
      signerType: 'USER',
      signatureFormat: 'CADES',
    });

    // Статус + outbox в столовую — в одной транзакции.
    const updated = await this.prisma.$transaction(async (tx) => {
      const mealUpdated = await tx.mealApplication.update({
        where: { id: BigInt(id) },
        data: { status: 'SUBMITTED', submitted_at: new Date(), external_sync_status: 'PENDING' },
      });
      await this.mealSync.enqueueMealOutbox(mealUpdated, tx);
      return mealUpdated;
    });

    return { mealApplication: updated, documentId: document.id, signatureId: signature.id };
  }

  /** Ищет активную (ACTIVE, не истёкшую) льготу; при eligibilityId — конкретную. */
  private async findActiveEligibility(
    userId: bigint,
    eligibilityId: bigint | null,
  ): Promise<{ id: bigint } | null> {
    return this.prisma.socialBenefitEligibility.findFirst({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        ...(eligibilityId != null ? { id: eligibilityId } : {}),
        OR: [{ valid_to: null }, { valid_to: { gte: new Date() } }],
      },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });
  }
}
