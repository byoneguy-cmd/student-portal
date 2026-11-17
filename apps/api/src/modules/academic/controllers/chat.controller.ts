import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { ChatService } from '../services/chat.service';
import { SendMessageDto } from '../dto/chat.dto';
import { serialize } from '../common/serialize';

/** Чаты и сообщения. */
@Controller('academic')
@Roles('STUDENT')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@CurrentUser('sub') sub: string): Promise<unknown[]> {
    const conversations = await this.chatService.getConversations(sub);
    return serialize(conversations);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @CurrentUser('sub') sub: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown[]> {
    const messages = await this.chatService.getMessages(sub, BigInt(id));
    return serialize(messages);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @CurrentUser('sub') sub: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ): Promise<Record<string, unknown>> {
    const message = await this.chatService.sendMessage(sub, BigInt(id), dto);
    return serialize(message);
  }
}
