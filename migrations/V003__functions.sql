-- =====================================================================
-- V003 — Общая функция триггера updated_at
-- Источник: docs/02-database.md, раздел 3.2
-- =====================================================================
CREATE OR REPLACE FUNCTION ops.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ops.touch_updated_at() IS
'Устанавливает NEW.updated_at = now() перед UPDATE. Подключается BEFORE UPDATE-триггерами к таблицам с аудит-колонками.';
