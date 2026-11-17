-- =====================================================================
-- V011 — Ops / Audit
-- Источник: docs/02-database.md, раздел 3.11 + частичный индекс из 4.3
-- =====================================================================

-- =====================================================================
-- ops.idempotency_keys — идемпотентность операций
-- =====================================================================
CREATE TABLE ops.idempotency_keys (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idempotency_key VARCHAR(128) NOT NULL,
    scope           VARCHAR(64)  NOT NULL,                        -- домен операции (e.g. payment, sign)
    request_hash    CHAR(64)     NOT NULL,                        -- SHA-256 канонического тела запроса
    response_status SMALLINT     NULL,
    response_body   JSONB        NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'IN_PROGRESS',  -- IN_PROGRESS / COMPLETED / FAILED
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_idempotency_keys UNIQUE (scope, idempotency_key),
    CONSTRAINT ck_idempotency_keys_hash CHECK (request_hash ~ '^[0-9a-f]{64}$')
);

COMMENT ON TABLE ops.idempotency_keys IS 'Гарантия идемпотентности: повторный запрос с тем же key возвращает закэшированный ответ.';

CREATE INDEX idx_idempotency_keys_expires ON ops.idempotency_keys (expires_at);

-- =====================================================================
-- ops.outbox_events — transactional outbox (партиционирована по дате)
-- =====================================================================
CREATE TABLE ops.outbox_events (
    id            BIGINT GENERATED ALWAYS AS IDENTITY,
    public_id     UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    aggregate_type VARCHAR(64) NOT NULL,                          -- e.g. 'document', 'meal_application'
    aggregate_id  UUID        NOT NULL,                           -- public_id агрегата
    event_type    VARCHAR(128) NOT NULL,                          -- e.g. 'document.signed'
    payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    status        ops.outbox_status NOT NULL DEFAULT 'PENDING',
    topic         VARCHAR(255) NULL,                              -- RabbitMQ exchange/routing или Kafka topic
    attempt_count INTEGER     NOT NULL DEFAULT 0,
    available_at  TIMESTAMPTZ NOT NULL DEFAULT now(),             -- отложенная доставка
    published_at  TIMESTAMPTZ NULL,
    last_error    TEXT        NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE ops.outbox_events IS 'Transactional outbox: события записываются в той же транзакции, что и бизнес-данные; релиз — отдельным процессом.';

CREATE INDEX idx_outbox_events_status ON ops.outbox_events (status, available_at);
CREATE INDEX idx_outbox_events_aggregate ON ops.outbox_events (aggregate_type, aggregate_id);
CREATE INDEX idx_outbox_events_payload ON ops.outbox_events USING GIN (payload jsonb_path_ops);

-- =====================================================================
-- ops.audit_log — аудит-журнал (партиционирована по дате, append-only)
-- =====================================================================
CREATE TABLE ops.audit_log (
    id           BIGINT GENERATED ALWAYS AS IDENTITY,
    public_id    UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    actor_id     UUID        NULL,                                -- public_id действующего лица
    actor_type   VARCHAR(32) NULL,                                -- user/system/service
    action       VARCHAR(64) NOT NULL,                            -- e.g. 'document.sign', 'room.allocate'
    resource_type VARCHAR(64) NULL,
    resource_id  UUID        NULL,
    ip_address   INET        NULL,
    user_agent   TEXT        NULL,
    trace_id     UUID        NULL,                                -- correlation id (OpenTelemetry)
    status       VARCHAR(16) NOT NULL DEFAULT 'SUCCESS',          -- SUCCESS/FAILURE/DENIED
    context      JSONB       NOT NULL DEFAULT '{}'::jsonb,        -- детали (с ПДн — маскированные)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE ops.audit_log IS 'Неизменяемый аудит-журнал всех юридически значимых действий. Append-only.';

CREATE INDEX idx_audit_log_actor    ON ops.audit_log (actor_id);
CREATE INDEX idx_audit_log_action   ON ops.audit_log (action);
CREATE INDEX idx_audit_log_resource ON ops.audit_log (resource_type, resource_id);
CREATE INDEX idx_audit_log_created  ON ops.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_context  ON ops.audit_log USING GIN (context jsonb_path_ops);

-- =====================================================================
-- Служебный индекс для релизера outbox (частичный, на «горячую» выборку)
-- Источник: docs/02-database.md, раздел 4.3
-- =====================================================================
CREATE INDEX idx_outbox_events_pending
    ON ops.outbox_events (available_at)
    WHERE status = 'PENDING';
