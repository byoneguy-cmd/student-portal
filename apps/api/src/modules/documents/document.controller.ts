import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { DocumentsService } from './documents.service';
import { toJson } from './serialize.util';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documents: DocumentsService) {}

  /** GET /documents — документы текущего пользователя. */
  @Get()
  async list(@CurrentUser('sub') sub: string): Promise<unknown> {
    return toJson(await this.documents.listUserDocuments(sub));
  }

  /** GET /documents/:id — метаданные документа. */
  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return toJson(await this.documents.getDocument(BigInt(id)));
  }

  /** GET /documents/:id/download — заглушка presigned URL (MinIO). */
  @Get(':id/download')
  async download(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ url: string; expiresIn: number; method: string }> {
    return this.documents.presign(BigInt(id));
  }
}
