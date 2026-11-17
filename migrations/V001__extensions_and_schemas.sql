-- =====================================================================
-- V001 — Расширения и схемы
-- Источник: docs/02-database.md, раздел 3.0
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid(), digest(), HMAC
CREATE EXTENSION IF NOT EXISTS btree_gist; -- exclusion-ограничения (опционально)

CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS doc;
CREATE SCHEMA IF NOT EXISTS acc;
CREATE SCHEMA IF NOT EXISTS social;
CREATE SCHEMA IF NOT EXISTS acad;
CREATE SCHEMA IF NOT EXISTS svc;
CREATE SCHEMA IF NOT EXISTS notif;
CREATE SCHEMA IF NOT EXISTS ops;

COMMENT ON SCHEMA iam    IS 'Модуль IAM & Profile: пользователи, профили, идентичности, импорт по ИИН';
COMMENT ON SCHEMA doc    IS 'Модуль Document & Signature: документы, пакеты, подписи, hash-chain';
COMMENT ON SCHEMA acc    IS 'Модуль Accommodation: общежития, комнаты, заявки, заселение';
COMMENT ON SCHEMA social IS 'Модуль Social Benefits: льготы, заявления на питание';
COMMENT ON SCHEMA acad   IS 'Модуль Academic (LMS): расписание, оценки, GPA, транскрипт, элективы, ДЗ, тесты, апелляции, чат';
COMMENT ON SCHEMA svc    IS 'Модуль University Services: справки, оплата обучения';
COMMENT ON SCHEMA notif  IS 'Модуль Notification: e-mail/SMS/push';
COMMENT ON SCHEMA ops    IS 'Ops/Audit: аудит-лог, идемпотентность, outbox, служебные функции';
