-- =====================================================================
-- V006 — Social Benefits
-- Источник: docs/02-database.md, раздел 3.5
-- (создаётся до Accommodation из-за FK)
-- =====================================================================

-- =====================================================================
-- social.social_benefit_types — справочник видов льгот
-- =====================================================================
CREATE TABLE social.social_benefit_types (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(64)  NOT NULL UNIQUE,                     -- e.g. ORPHAN, LARGE_FAMILY, DISABILITY, LOW_INCOME
    name_ru     VARCHAR(255) NOT NULL,
    name_kz     VARCHAR(255) NOT NULL,
    description TEXT        NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    requires_document BOOLEAN NOT NULL DEFAULT TRUE,              -- нужен ли подтверждающий документ
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE social.social_benefit_types IS 'Справочник видов социальных льгот (сироты, многодетные, инвалидность, малообеспеченные и т.п.).';

CREATE TRIGGER trg_social_benefit_types_updated_at BEFORE UPDATE ON social.social_benefit_types
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- social.social_benefit_eligibilities — подтверждённое право на льготу
-- =====================================================================
CREATE TABLE social.social_benefit_eligibilities (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id        UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id          BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    benefit_type_id  BIGINT      NOT NULL REFERENCES social.social_benefit_types(id) ON DELETE RESTRICT,
    status           social.eligibility_status NOT NULL DEFAULT 'PENDING',
    valid_from       DATE        NULL,
    valid_to         DATE        NULL,
    source_import_id BIGINT      NULL REFERENCES iam.external_data_imports(id) ON DELETE SET NULL,
    document_id      BIGINT      NULL REFERENCES doc.documents(id) ON DELETE SET NULL,  -- подтверждающий документ
    verified_at      TIMESTAMPTZ NULL,
    verified_by      UUID        NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by       UUID        NULL,
    updated_by       UUID        NULL,
    CONSTRAINT ck_social_benefit_elig_validity CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

COMMENT ON TABLE social.social_benefit_eligibilities IS 'Подтверждённое право пользователя на льготу (источник: Smart Data Ukimet/МТСЗН).';

CREATE INDEX idx_social_benefit_elig_user  ON social.social_benefit_eligibilities (user_id);
CREATE INDEX idx_social_benefit_elig_type  ON social.social_benefit_eligibilities (benefit_type_id);
CREATE INDEX idx_social_benefit_elig_status ON social.social_benefit_eligibilities (status);
CREATE INDEX idx_social_benefit_elig_valid ON social.social_benefit_eligibilities (valid_to);

CREATE TRIGGER trg_social_benefit_elig_updated_at BEFORE UPDATE ON social.social_benefit_eligibilities
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- social.meal_applications — заявления на льготное питание
-- =====================================================================
CREATE TABLE social.meal_applications (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id      UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id        BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    eligibility_id BIGINT      NULL REFERENCES social.social_benefit_eligibilities(id) ON DELETE SET NULL,
    status         social.meal_application_status NOT NULL DEFAULT 'DRAFT',
    meal_period    social.meal_period NOT NULL DEFAULT 'ALL_DAY',
    valid_from     DATE        NULL,
    valid_to       DATE        NULL,
    canteen_id     VARCHAR(64) NULL,                              -- id столовой/точки питания
    external_sync_status VARCHAR(32) NULL,                        -- статус синхронизации со столовой
    rejected_reason TEXT       NULL,
    submitted_at   TIMESTAMPTZ NULL,
    approved_at    TIMESTAMPTZ NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by     UUID        NULL,
    updated_by     UUID        NULL
);

COMMENT ON TABLE social.meal_applications IS 'Заявление на льготное питание. Статус синхронизируется со столовой асинхронно (outbox).';

CREATE INDEX idx_meal_applications_user      ON social.meal_applications (user_id);
CREATE INDEX idx_meal_applications_status    ON social.meal_applications (status);
CREATE INDEX idx_meal_applications_eligibility ON social.meal_applications (eligibility_id);

CREATE TRIGGER trg_meal_applications_updated_at BEFORE UPDATE ON social.meal_applications
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();
