/**
 * Контракты адаптера NCALayer (локальный агент, JSON-RPC на 127.0.0.1:13579).
 * Приватный ключ никогда не покидает машину пользователя.
 */

/** Результат обнаружения агента. */
export interface NcaLayerAgentInfo {
  running: boolean;
  version?: string;
  port: number;
}

/** Входные данные формирования CAdES. */
export interface CadesSignInput {
  keyAlias: string;
  data: string;
  storageType?: string;
  password?: string;
  signType?: string;
}

/** Результат формирования подписи. */
export interface CadesSignResult {
  signedData: string;
  signatureAlgorithm?: string;
  signerCertificate?: string;
}

/** Входные данные проверки CAdES. */
export interface CadesVerifyInput {
  signedData: string;
  data?: string;
  verifyOcsp?: boolean;
  verifyCrl?: boolean;
}

/** Результат проверки подписи. */
export interface CadesVerifyResult {
  valid: boolean;
  certStatus?: string;
  signer?: {
    subjectDN?: string;
    iin?: string;
    serialNumber?: string;
  };
}

/** Входные данные пакетного подписания. */
export interface BatchSignInput {
  keyAlias: string;
  documents: Array<{ documentId: string; data: string }>;
  password?: string;
}

/** Результат пакетного подписания. */
export interface BatchSignResult {
  signatures: Array<{ documentId: string; signedData: string }>;
  signerCertificate?: string;
}
