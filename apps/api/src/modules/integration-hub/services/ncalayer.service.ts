import { Injectable, Logger } from '@nestjs/common';
import {
  BatchSignInput,
  BatchSignResult,
  CadesSignInput,
  CadesSignResult,
  CadesVerifyInput,
  CadesVerifyResult,
  NcaLayerAgentInfo,
} from '../types';

/**
 * Адаптер NCALayer: локальный агент на 127.0.0.1:13579 (JSON-RPC / WebSocket).
 * Приватный ключ никогда не покидает машину пользователя. Здесь — заглушка.
 */
@Injectable()
export class NcaLayerService {
  private readonly logger = new Logger(NcaLayerService.name);
  private readonly port = 13579;

  /** Обнаружение агента: пробуем JSON-RPC `status` на 127.0.0.1:13579. */
  async detectAgent(): Promise<NcaLayerAgentInfo> {
    try {
      const res = await fetch(`http://127.0.0.1:${this.port}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'kz.gov.pki.knca.commonUtils.KncaUtil',
          method: 'status',
          args: [],
          id: 1,
        }),
        signal: AbortSignal.timeout(2000),
      });
      return { running: res.ok, version: 'stub', port: this.port };
    } catch {
      return { running: false, port: this.port };
    }
  }

  /** Формирование CAdES — заглушка JSON-RPC. */
  async createCAdES(input: CadesSignInput): Promise<CadesSignResult> {
    this.logger.log(`createCAdES — заглушка (keyAlias=${input.keyAlias})`);
    return {
      signedData: Buffer.from(`signed:${input.data.slice(0, 64)}`).toString('base64'),
      signatureAlgorithm: 'SHA256withRSA',
      signerCertificate: 'stub-x509-certificate',
    };
  }

  /** Проверка CAdES — заглушка. */
  async verifyCAdES(input: CadesVerifyInput): Promise<CadesVerifyResult> {
    this.logger.log('verifyCAdES — заглушка');
    return {
      valid: true,
      certStatus: 'good',
      signer: { iin: '920101300123', serialNumber: '5A9C0000' },
    };
  }

  /** Пакетное подписание (договор + акт + заявление) — заглушка. */
  async batchSign(input: BatchSignInput): Promise<BatchSignResult> {
    this.logger.log(`batchSign — заглушка (${input.documents.length} документов)`);
    return {
      signatures: input.documents.map((d) => ({
        documentId: d.documentId,
        signedData: Buffer.from(`signed:${d.data.slice(0, 64)}`).toString('base64'),
      })),
      signerCertificate: 'stub-x509-certificate',
    };
  }
}
