import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StudentContextService } from './student-context.service';
import { SendMessageDto } from '../dto/chat.dto';

/**
 * Чаты: беседы текущего пользователя, сообщения и отправка.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentContext: StudentContextService,
  ) {}

  /** Беседы, в которых участвует текущий пользователь. */
  async getConversations(keycloakSubject: string): Promise<unknown[]> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { user_id: userId },
      include: {
        conversation: {
          include: {
            conversation_participants: {
              include: {
                user: { select: { id: true, public_id: true, email: true, phone: true, user_profile: true } },
              },
            },
            messages: { orderBy: { created_at: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { last_read_at: 'desc' },
    });

    return participants.map((p) => p.conversation) as unknown[];
  }

  /** Сообщения конкретной беседы (только для участника). */
  async getMessages(keycloakSubject: string, conversationId: bigint): Promise<unknown[]> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);
    await this.ensureParticipant(userId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
    });
    return messages as unknown[];
  }

  /** Отправка сообщения в беседу. */
  async sendMessage(
    keycloakSubject: string,
    conversationId: bigint,
    dto: SendMessageDto,
  ): Promise<Record<string, unknown>> {
    const userId = await this.studentContext.resolveUserId(keycloakSubject);
    await this.ensureParticipant(userId, conversationId);

    const message = await this.prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_user_id: userId,
        msg_type: dto.msg_type ?? 'TEXT',
        body: dto.body,
        attachments: (dto.attachments ?? []) as any,
      },
    });
    return message as unknown as Record<string, unknown>;
  }

  /** Проверка участия пользователя в беседе. */
  private async ensureParticipant(userId: bigint, conversationId: bigint): Promise<void> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
    });
    if (!participant) throw new NotFoundException('Вы не участник этой беседы');
  }
}
