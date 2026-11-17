import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { QrChallenge, QrChallengeInit, QrSignatureVerification, QrSignatureVerificationInput } from '../types';

/**
 * Адаптер eGov Mobile QR: сервер генерирует challenge, пользователь подтверждает
 * действие в приложении, портал верифицирует подпись и выдаёт сессию.
 * Точный deep-link и формат подписи — по техпаспорту оператора (АО «НИТ» / АО «ЦЭБ»).
 */
@Injectable()
export class EgovService {
  private readonly logger = new Logger(EgovService.name);

  constructor(private readonly config: ConfigService) {}

  /** Создать challenge для QR (TTL по умолчанию 120 с). */
  async initQrChallenge(input: QrChallengeInit): Promise<QrChallenge> {
    const challengeId = randomUUID();
    const nonce = randomUUID().slice(0, 8);
    const ttlSeconds = input.ttlSeconds ?? 120;
    const baseUrl = this.config.get<string>('EGOV_BASE_URL', '');

    if (!baseUrl) {
      this.logger.warn('EGOV_BASE_URL не задан — возвращаю заглушку challenge');
      return this.buildChallenge(challengeId, nonce, ttlSeconds);
    }

    try {
      const res = await fetch(`${baseUrl}/v1/integrations/egov-qr/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: input.serviceId, purpose: input.purpose, ttlSeconds }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as Partial<QrChallenge>;
      return this.buildChallenge(
        json.challengeId ?? challengeId,
        nonce,
        json.ttlSeconds ?? ttlSeconds,
      );
    } catch (err) {
      this.logger.error(`eGov Mobile QR недоступен: ${(err as Error).message}`);
      throw new ServiceUnavailableException('eGov Mobile QR недоступен');
    }
  }

  /**
   * Верификация QR-подписи. Заглушка: в проде — проверка CAdES, покрытия nonce,
   * статуса сертификата по OCSP/CRL и извлечение ИИН из сертификата (OID 1.2.398.3.3.2.1).
   */
  async verifyQrSignature(input: QrSignatureVerificationInput): Promise<QrSignatureVerification> {
    this.logger.log('verifyQrSignature — заглушка (OCSP/CRL + CAdES не выполняются)');
    return {
      challengeId: input.challengeId,
      verified: true,
      status: 'SUCCESS',
      identity: {
        iin: '920101300123',
        fullName: 'АХМЕТОВА АЙГЕРИМ СЕРГЕЕВНА',
        certificateSerial: '5A:9C:00:00:00:00',
        issuerDN: 'CN=Ұлттық куәландырушы орталық (RSA),O=НУЦ РК,C=KZ',
      },
    };
  }

  private buildChallenge(challengeId: string, nonce: string, ttlSeconds: number): QrChallenge {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    return {
      challengeId,
      qrPayload: `egovmobile://auth?challenge=${challengeId}&nonce=${nonce}&alg=ES256`,
      expiresAt,
      ttlSeconds,
    };
  }
}
