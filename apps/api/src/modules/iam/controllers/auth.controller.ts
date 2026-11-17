import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Public } from '../../../common/auth/public.decorator';
import type { AuthUser } from '../../../common/auth/jwt-auth.guard';
import { AuthService } from '../services/auth.service';
import { EgovMobileCompleteDto, NcaLayerCompleteDto } from '../dto/auth.dto';
import { serialize } from '../common/serialize';

/**
 * Контроллер аутентификации: вход через eGov Mobile и NCALayer.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('egov-mobile/init')
  initEgovMobile(): { challengeId: string; qrData: string; expiresAt: string } {
    return this.authService.initChallenge('EGOV_MOBILE');
  }

  @Public()
  @Post('egov-mobile/complete')
  async completeEgovMobile(@Body() dto: EgovMobileCompleteDto): Promise<Record<string, unknown>> {
    const user = await this.authService.completeChallenge({
      provider: 'EGOV_MOBILE',
      iin: dto.iin,
      email: dto.email,
      phone: dto.phone,
    });
    return serialize(user);
  }

  @Public()
  @Post('ncalayer/init')
  initNcaLayer(): { challengeId: string; qrData: string; expiresAt: string } {
    return this.authService.initChallenge('NCALAYER');
  }

  @Public()
  @Post('ncalayer/complete')
  async completeNcaLayer(@Body() dto: NcaLayerCompleteDto): Promise<Record<string, unknown>> {
    const user = await this.authService.completeChallenge({
      provider: 'NCALAYER',
      iin: dto.iin,
      certificateSerial: dto.certificateSerial,
      certificateIssuer: dto.certificateIssuer,
      email: dto.email,
      phone: dto.phone,
    });
    return serialize(user);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<Record<string, unknown>> {
    const profile = await this.authService.me(user.sub);
    return serialize(profile);
  }
}
