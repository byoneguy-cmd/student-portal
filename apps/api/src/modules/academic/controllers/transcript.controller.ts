import { Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { TranscriptService } from '../services/transcript.service';
import { TermQueryDto } from '../dto/common.dto';
import { serialize } from '../common/serialize';

/** Транскрипт студента. */
@Controller('academic')
@Roles('STUDENT')
export class TranscriptController {
  constructor(private readonly transcriptService: TranscriptService) {}

  @Get('transcript')
  async list(@CurrentUser('sub') sub: string): Promise<unknown[]> {
    const transcripts = await this.transcriptService.list(sub);
    return serialize(transcripts);
  }

  @Post('transcript/request')
  async request(
    @CurrentUser('sub') sub: string,
    @Query() query: TermQueryDto,
  ): Promise<Record<string, unknown>> {
    const transcript = await this.transcriptService.request(sub, query.termId);
    return serialize(transcript);
  }
}
