import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileDto, ImportProfileDto } from '../dto/profile.dto';
import { serialize } from '../common/serialize';

/**
 * Контроллер профиля текущего пользователя.
 */
@Controller('profile')
@Roles('STUDENT')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser('sub') sub: string): Promise<Record<string, unknown>> {
    const profile = await this.profileService.getProfile(sub);
    return serialize(profile);
  }

  @Patch()
  async updateProfile(
    @CurrentUser('sub') sub: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<Record<string, unknown>> {
    const profile = await this.profileService.updateProfile(sub, dto);
    return serialize(profile);
  }

  @Get('imports')
  async getImports(@CurrentUser('sub') sub: string): Promise<unknown[]> {
    const imports = await this.profileService.getImports(sub);
    return serialize(imports);
  }

  @Post('import')
  async importData(
    @CurrentUser('sub') sub: string,
    @Body() dto: ImportProfileDto,
  ): Promise<Record<string, unknown>> {
    const result = await this.profileService.importData(sub, dto.source);
    return serialize(result);
  }
}
