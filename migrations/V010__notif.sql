-- =====================================================================
-- V010 — Notification
-- Источник: docs/02-database.md, раздел 3.10
-- =====================================================================

-- =====================================================================
-- notif.notifications — уведомления (партиционирована по дате)
-- =====================================================================
CREATE TABLE notif.notifications (
    id           BIGINT GENERATED ALWAYS AS IDENTITY,
    public_id    UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id      BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    channel      notif.notification_channel NOT NULL,
    status       notif.notification_status NOT NULL DEFAULT 'PENDING',
    priority     notif.notification_priority NOT NULL DEFAULT 'NORMAL',
    subject      VARCHAR(255) NULL,
    body         TEXT        NULL,
    payload      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    scheduled_at TIMESTAMPTZ NULL,
    sent_at      TIMESTAMPTZ NULL,
    read_at      TIMESTAMPTZ NULL,
    error_message TEXT       NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)                                  -- created_at входит в PK для партиционирования
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE notif.notifications IS 'Уведомления (e-mail/SMS/push/in-app). Партиционирована по created_at (месяц).';

CREATE INDEX idx_notifications_user   ON notif.notifications (user_id);
CREATE INDEX idx_notifications_status ON notif.notifications (status);
CREATE INDEX idx_notifications_payload ON notif.notifications USING GIN (payload jsonb_path_ops);
