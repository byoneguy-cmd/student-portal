import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { ElectivesService } from '../services/electives.service';
import { TermQueryDto } from '../dto/common.dto';
import { serialize } from '../common/serialize';

/** Элективные курсы. */
@Controller('academic')
@Roles('STUDENT')
export class ElectivesController {
  constructor(private readonly electivesService: ElectivesService) {}

  @Get('electives')
  async list(
    @CurrentUser('sub') sub: string,
    @Query() query: TermQueryDto,
  ): Promise<unknown[]> {
    const electives = await this.electivesService.list(sub, query.termId);
    return serialize(electives);
  }

  @Post('electives/:id/register')
  async register(
    @CurrentUser('sub') sub: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Record<string, unknown>> {
    const enrollment = await this.electivesService.register(sub, BigInt(id));
    return serialize(enrollment);
  }
}
