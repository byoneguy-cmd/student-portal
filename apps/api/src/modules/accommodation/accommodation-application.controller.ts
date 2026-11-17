import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AccommodationService } from './accommodation.service';
import { CreateAccommodationApplicationDto } from './dto/create-accommodation-application.dto';
import { toJson } from './serialize.util';

@Controller('accommodation')
export class AccommodationApplicationController {
  constructor(private readonly accommodation: AccommodationService) {}

  /** POST /accommodation/applications — создать заявку на место в общежитии. */
  @Post('applications')
  async create(
    @CurrentUser('sub') sub: string,
    @Body() dto: CreateAccommodationApplicationDto,
  ): Promise<unknown> {
    return toJson(await this.accommodation.createApplication(sub, dto));
  }

  /** GET /accommodation/applications — заявки текущего пользователя. */
  @Get('applications')
  async list(@CurrentUser('sub') sub: string): Promise<unknown> {
    return toJson(await this.accommodation.listApplications(sub));
  }

  /** GET /accommodation/applications/:id — заявка по id. */
  @Get('applications/:id')
  async get(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return toJson(await this.accommodation.getApplication(id));
  }
}
