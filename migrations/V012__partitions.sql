-- =====================================================================
-- V012 — Партиции больших таблиц
-- Источник: docs/02-database.md, раздел 4.1
-- Политика: RANGE по created_at, месячные партиции + DEFAULT-партиция.
-- =====================================================================

-- =====================================================================
-- Партиции audit_log (месячные)
-- =====================================================================
CREATE TABLE ops.audit_log_2026_11 PARTITION OF ops.audit_log
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE ops.audit_log_2026_12 PARTITION OF ops.audit_log
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE ops.audit_log_default PARTITION OF ops.audit_log DEFAULT;

-- =====================================================================
-- Партиции outbox_events (месячные)
-- =====================================================================
CREATE TABLE ops.outbox_events_2026_11 PARTITION OF ops.outbox_events
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE ops.outbox_events_default PARTITION OF ops.outbox_events DEFAULT;

-- =====================================================================
-- Партиции notifications (месячные)
-- =====================================================================
CREATE TABLE notif.notifications_2026_11 PARTITION OF notif.notifications
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE notif.notifications_default PARTITION OF notif.notifications DEFAULT;
