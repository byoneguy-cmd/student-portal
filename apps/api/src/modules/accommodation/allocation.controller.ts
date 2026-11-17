import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AccommodationService } from './accommodation.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { toJson } from './serialize.util';

@Controller('accommodation')
export class AllocationController {
  constructor(private readonly accommodation: AccommodationService) {}

  /** POST /accommodation/allocations — заселение/распределение (admin). */
  @Roles('ADMIN')
  @Post('allocations')
  async allocate(@Body() dto: CreateAllocationDto): Promise<unknown> {
    return toJson(await this.accommodation.allocate(dto));
  }

  /** GET /accommodation/allocations — все выделения (admin). */
  @Roles('ADMIN')
  @Get('allocations')
  async list(): Promise<unknown> {
    return toJson(await this.accommodation.listAllocations());
  }

  /** GET /accommodation/allocations/me — выделения текущего пользователя. */
  @Get('allocations/me')
  async mine(@CurrentUser('sub') sub: string): Promise<unknown> {
    return toJson(await this.accommodation.listMyAllocations(sub));
  }
}
