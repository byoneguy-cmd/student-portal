import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import type { CreateAccommodationApplicationDto } from './dto/create-accommodation-application.dto';
import type { CreateAllocationDto } from './dto/create-allocation.dto';

@Injectable()
export class AccommodationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
  ) {}

  /** Резолвит числовой id пользователя по keycloak subject. */
  private async resolveUserId(sub: string): Promise<bigint> {
    const user = await this.prisma.user.findUnique({ where: { keycloak_subject: sub } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user.id;
  }

  // ---- Общежития и комнаты ----

  async listDormitories(): Promise<unknown> {
    return this.prisma.dormitory.findMany({ orderBy: { name_ru: 'asc' } });
  }

  async getDormitory(id: number): Promise<unknown> {
    const dormitory = await this.prisma.dormitory.findUnique({ where: { id: BigInt(id) } });
    if (!dormitory) throw new NotFoundException('Общежитие не найдено');
    return dormitory;
  }

  async listRooms(dormitoryId: number): Promise<unknown> {
    const dormitory = await this.prisma.dormitory.findUnique({ where: { id: BigInt(dormitoryId) } });
    if (!dormitory) throw new NotFoundException('Общежитие не найдено');
    return this.prisma.room.findMany({
      where: { dormitory_id: BigInt(dormitoryId) },
      orderBy: [{ floor: 'asc' }, { room_number: 'asc' }],
    });
  }

  // ---- Заявки ----

  async createApplication(sub: string, dto: CreateAccommodationApplicationDto): Promise<unknown> {
    const userId = await this.resolveUserId(sub);
    return this.prisma.accommodationApplication.create({
      data: {
        user_id: userId,
        academic_term_id: dto.academicTermId != null ? BigInt(dto.academicTermId) : null,
        preferred_dormitory_id: dto.preferredDormitoryId != null ? BigInt(dto.preferredDormitoryId) : null,
        preferred_room_id: dto.preferredRoomId != null ? BigInt(dto.preferredRoomId) : null,
        eligibility_id: dto.eligibilityId != null ? BigInt(dto.eligibilityId) : null,
        priority: dto.priority ?? 0,
        status: 'DRAFT',
        metadata: {},
      },
    });
  }

  async listApplications(sub: string): Promise<unknown> {
    const userId = await this.resolveUserId(sub);
    return this.prisma.accommodationApplication.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getApplication(id: number): Promise<unknown> {
    const application = await this.prisma.accommodationApplication.findUnique({
      where: { id: BigInt(id) },
      include: { eligibility: true, preferred_dormitory: true, preferred_room: true },
    });
    if (!application) throw new NotFoundException('Заявка не найдена');
    return application;
  }

  // ---- Распределение / заселение ----

  /** Точка входа POST /allocations: точечное заселение либо автоматическое распределение. */
  async allocate(dto: CreateAllocationDto): Promise<unknown> {
    const hasApplication = dto.applicationId != null;
    const hasRoom = dto.roomId != null;

    if (hasApplication && hasRoom) {
      return this.allocateSingle(BigInt(dto.applicationId as number), BigInt(dto.roomId as number), dto);
    }
    if (hasApplication || hasRoom) {
      throw new BadRequestException('Укажите applicationId и roomId одновременно, либо ни одного (автораспределение)');
    }
    return this.runAllocation();
  }

  /** Распределение комнат: льготники (ACTIVE eligibility) — первыми. */
  private async runAllocation(): Promise<unknown[]> {
    const applications = await this.prisma.accommodationApplication.findMany({
      where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] } },
      include: { eligibility: true },
      orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
    });

    // Льготники с ACTIVE eligibility получают преимущество независимо от priority.
    const prioritized = applications.sort((a, b) => {
      const aBenefit = a.eligibility?.status === 'ACTIVE' ? 1 : 0;
      const bBenefit = b.eligibility?.status === 'ACTIVE' ? 1 : 0;
      return bBenefit - aBenefit;
    });

    const result: unknown[] = [];
    for (const application of prioritized) {
      const existing = await this.prisma.roomAllocation.findFirst({
        where: { application_id: application.id, status: { in: ['PENDING_MOVE_IN', 'ACTIVE'] } },
      });
      if (existing) continue;

      const room = await this.findFreeRoom(application.preferred_dormitory_id);
      if (!room) continue;

      result.push(await this.allocateSingle(application.id, room.id, {}));
    }
    return result;
  }

  /** Точечное заселение: создание RoomAllocation + обновление Room.status + пакет документов + СКУД. */
  private async allocateSingle(
    applicationId: bigint,
    roomId: bigint,
    dto: Partial<CreateAllocationDto>,
  ): Promise<unknown> {
    const application = await this.prisma.accommodationApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('Заявка не найдена');

    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Комната не найдена');
    if (room.occupied >= room.capacity) {
      throw new BadRequestException('В комнате нет свободных мест');
    }

    // Связанные вставки/обновления — в одной транзакции.
    const allocation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.roomAllocation.create({
        data: {
          application_id: applicationId,
          room_id: roomId,
          user_id: application.user_id,
          status: 'PENDING_MOVE_IN',
          contract_terms: {},
          check_in_date: dto.checkInDate ? new Date(dto.checkInDate) : null,
          check_out_date: dto.checkOutDate ? new Date(dto.checkOutDate) : null,
        },
      });

      const occupied = room.occupied + 1;
      await tx.room.update({
        where: { id: roomId },
        data: { occupied, status: occupied >= room.capacity ? 'OCCUPIED' : 'PARTIALLY_OCCUPIED' },
      });

      await tx.accommodationApplication.update({
        where: { id: applicationId },
        data: { status: 'APPROVED', decided_at: new Date() },
      });

      return created;
    });

    // Пакет документов: договор найма + правила + акт приёма-передачи.
    const pkg = await this.documents.generateMoveInPackage(application.user_id, {
      allocationId: allocation.id,
      roomNumber: room.room_number,
    });

    await this.prisma.roomAllocation.update({
      where: { id: allocation.id },
      data: {
        lease_contract_document_id: pkg.leaseContractDocumentId,
        handover_act_document_id: pkg.handoverActDocumentId,
      },
    });

    await this.syncToSkud(allocation.id, allocation.public_id, application.user_id);

    return this.prisma.roomAllocation.findUnique({ where: { id: allocation.id } });
  }

  private async findFreeRoom(preferredDormitoryId: bigint | null): Promise<{ id: bigint } | null> {
    return this.prisma.room.findFirst({
      where: {
        status: 'FREE',
        ...(preferredDormitoryId != null ? { dormitory_id: preferredDormitoryId } : {}),
      },
      orderBy: { capacity: 'asc' },
      select: { id: true },
    });
  }

  async listAllocations(): Promise<unknown> {
    return this.prisma.roomAllocation.findMany({
      include: {
        room: true,
        application: true,
        user: { select: { public_id: true, email: true, keycloak_subject: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async listMyAllocations(sub: string): Promise<unknown> {
    const userId = await this.resolveUserId(sub);
    return this.prisma.roomAllocation.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Заглушка синхронизации со СКУД: пишет outbox-событие и пытается выполнить HTTP-вызов.
   * TODO: реальный вызов через Integration Hub (адрес и токены — из конфигурации).
   */
  private async syncToSkud(allocationId: bigint, publicId: string, userId: bigint): Promise<void> {
    const payload = { allocationId: publicId, userId: String(userId), action: 'GRANT_ACCESS' };

    await this.prisma.outboxEvent.create({
      data: {
        id: this.nextOutboxId(),
        aggregate_type: 'RoomAllocation',
        aggregate_id: publicId,
        event_type: 'accommodation.allocation.created',
        payload,
        topic: 'skud',
        status: 'PENDING',
      },
    });

    try {
      await fetch('http://localhost:9100/skud/access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Заглушка: сбой сети не роняет бизнес-операцию — событие остаётся в outbox.
    }
  }

  /** Генерирует уникальный id outbox-события (в raw-миграции id — IDENTITY). */
  private nextOutboxId(): bigint {
    const millis = BigInt(Date.now());
    const random = BigInt(Math.floor(Math.random() * 0x100000));
    return (millis << 20n) | random;
  }
}
