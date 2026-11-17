/**
 * Контракты Transactional Outbox.
 */

/** Параметры публикации события в outbox. */
export interface OutboxPublishParams {
  eventType: string;
  aggregateType: string;
  /** UUID публичного идентификатора агрегата (public_id). */
  aggregateId: string;
  payload: Record<string, unknown>;
}
