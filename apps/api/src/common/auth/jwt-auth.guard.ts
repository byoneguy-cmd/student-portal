import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { JwksClient } from 'jwks-rsa';
import { IS_PUBLIC_KEY } from './public.decorator';
import { Reflector } from '@nestjs/core';

export interface AuthUser {
  sub: string;
  iin?: string;
  preferred_username?: string;
  email?: string;
  roles: string[];
}

const JWKS_CACHE_TTL = 300_000; // 5 минут

/**
 * Глобальный guard: валидирует Bearer JWT (RS256) против JWKS Keycloak.
 * При AUTH_ENABLED=false подставляет dev-пользователя (локальная разработка).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwksClient: JwksClient;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    this.jwksClient = jwksClient({
      jwksUri: this.config.get<string>(
        'KEYCLOAK_JWKS_URI',
        'http://localhost:8080/realms/student-portal/protocol/openid-connect/certs',
      ),
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();

    if (this.config.get<string>('AUTH_ENABLED', 'true') === 'false') {
      request.user = { sub: 'dev-user', roles: ['STUDENT', 'ADMIN'] };
      return true;
    }

    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Отсутствует токен доступа');

    const payload = await this.verify(token);
    request.user = this.toAuthUser(payload);
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }

  private async verify(token: string): Promise<jwt.JwtPayload> {
    const key = await this.getSigningKey(this.kidOf(token));
    try {
      return jwt.verify(token, key, {
        algorithms: ['RS256'],
        issuer: this.config.get<string>(
          'KEYCLOAK_ISSUER',
          'http://localhost:8080/realms/student-portal',
        ),
      }) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedException('Недействительный токен доступа');
    }
  }

  private kidOf(token: string): string {
    const header = jwt.decode(token, { complete: true });
    const kid = (header?.header as { kid?: string } | undefined)?.kid;
    if (!kid) throw new UnauthorizedException('В токене отсутствует kid');
    return kid;
  }

  private async getSigningKey(kid: string): Promise<string> {
    const key = await this.jwksClient.getSigningKey(kid);
    return key.getPublicKey();
  }

  private toAuthUser(payload: jwt.JwtPayload): AuthUser {
    const realmAccess = (payload.realm_access ?? {}) as { roles?: string[] };
    const roles = realmAccess.roles ?? [];
    return {
      sub: String(payload.sub ?? ''),
      iin: typeof payload.iin === 'string' ? payload.iin : undefined,
      preferred_username:
        typeof payload.preferred_username === 'string' ? payload.preferred_username : undefined,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      roles,
    };
  }
}

// Экспорт для корректной работы ESM-совместимого импорта jwks-rsa.
export const _JWKS_CACHE_TTL = JWKS_CACHE_TTL;
