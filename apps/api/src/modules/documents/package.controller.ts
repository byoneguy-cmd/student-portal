import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { DocumentsService } from './documents.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { toJson } from './serialize.util';

@Controller('documents/packages')
export class PackageController {
  constructor(private readonly documents: DocumentsService) {}

  /** POST /documents/packages — создать пакет документов. */
  @Post()
  async create(@CurrentUser('sub') sub: string, @Body() dto: CreatePackageDto): Promise<unknown> {
    return toJson(await this.documents.createPackage(sub, dto));
  }

  /** GET /documents/packages — список пакетов. */
  @Get()
  async list(): Promise<unknown> {
    return toJson(await this.documents.listPackages());
  }

  /** GET /documents/packages/:id — пакет со вложениями. */
  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return toJson(await this.documents.getPackage(BigInt(id)));
  }

  /** POST /documents/packages/:id/sign — пакетное подписание (DocumentSignature PENDING). */
  @Post(':id/sign')
  async sign(@CurrentUser('sub') sub: string, @Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return toJson(await this.documents.signPackage(sub, BigInt(id)));
  }
}
