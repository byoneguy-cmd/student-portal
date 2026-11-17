import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AccommodationService } from './accommodation.service';
import { toJson } from './serialize.util';

@Controller('accommodation')
export class DormitoryController {
  constructor(private readonly accommodation: AccommodationService) {}

  /** GET /accommodation/dormitories — список общежитий. */
  @Get('dormitories')
  async list(): Promise<unknown> {
    return toJson(await this.accommodation.listDormitories());
  }

  /** GET /accommodation/dormitories/:id — общежитие по id. */
  @Get('dormitories/:id')
  async get(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return toJson(await this.accommodation.getDormitory(id));
  }

  /** GET /accommodation/dormitories/:id/rooms — комнаты общежития. */
  @Get('dormitories/:id/rooms')
  async rooms(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return toJson(await this.accommodation.listRooms(id));
  }
}
