-- =====================================================================
-- V004 — IAM & Profile
-- Источник: docs/02-database.md, раздел 3.3
-- =====================================================================

-- =====================================================================
-- iam.users — ядро идентичности (проекция пользователя из Keycloak)
-- =====================================================================
CREATE TABLE iam.users (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id         UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    iin               VARCHAR(12) NULL,                          -- зашифрован на уровне приложения; в БД HMAC-токен (см. 8)
    iin_token         CHAR(64)    NULL UNIQUE,                   -- HMAC-SHA256(ИИН) для поиска/дедупликации без расшифровки
    email             VARCHAR(320) NULL,
    email_normalized  VARCHAR(320) NULL,
    phone             VARCHAR(20)  NULL,
    keycloak_subject  UUID         NULL UNIQUE,                  -- subject из Keycloak (OIDC)
    status            iam.user_status NOT NULL DEFAULT 'PENDING',
    locale            VARCHAR(10)  NOT NULL DEFAULT 'ru',
    timezone          VARCHAR(64)  NOT NULL DEFAULT 'Asia/Qyzylorda',
    is_pdn_consent_given BOOLEAN   NOT NULL DEFAULT FALSE,
    last_login_at     TIMESTAMPTZ  NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by        UUID         NULL,
    updated_by        UUID         NULL,
    CONSTRAINT ck_users_iin_format CHECK (iin IS NULL OR iin ~ '^[0-9]{12}$'),
    CONSTRAINT ck_users_email_format CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

COMMENT ON TABLE iam.users IS 'Пользователь портала (студент/сотрудник/админ). Авторизация — Keycloak; здесь — проекция и доменные атрибуты.';
COMMENT ON COLUMN iam.users.iin IS 'ИИН (12 цифр). Хранится в зашифрованном виде на уровне приложения (AES-256-GCM); в этой колонке — только шифротекст/токен.';
COMMENT ON COLUMN iam.users.iin_token IS 'HMAC-SHA256(ИИН, server_secret) — детерминированный токен для поиска и дедупликации без расшифровки.';
COMMENT ON COLUMN iam.users.keycloak_subject IS 'Идентификатор субъекта в Keycloak (OIDC). Пароли и сессии в БД не хранятся.';

CREATE INDEX idx_users_status            ON iam.users (status);
CREATE INDEX idx_users_email_normalized  ON iam.users (email_normalized);
CREATE INDEX idx_users_iin_token         ON iam.users (iin_token);
CREATE INDEX idx_users_last_login_at     ON iam.users (last_login_at DESC);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON iam.users
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- iam.user_profiles — персональные данные (расширенный профиль)
-- =====================================================================
CREATE TABLE iam.user_profiles (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id            BIGINT      NOT NULL UNIQUE REFERENCES iam.users(id) ON DELETE CASCADE,
    first_name         VARCHAR(128) NULL,
    last_name          VARCHAR(128) NULL,
    middle_name        VARCHAR(128) NULL,
    iin_short          CHAR(4)     NULL,                          -- последние 4 цифры ИИН для отображения (маскирование)
    birth_date         DATE        NULL,
    gender             CHAR(1)     NULL,
    nationality        VARCHAR(64) NULL,
    citizenship        VARCHAR(64) NULL,
    home_address       TEXT        NULL,
    registration_address TEXT      NULL,
    document_type      VARCHAR(32) NULL,                          -- тип удостоверения личности
    document_number    VARCHAR(32) NULL,
    document_issue_date DATE       NULL,
    emergency_contact  JSONB       NULL,                          -- {name, phone, relation}
    extra              JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- гибкие поля (мед. показания, соц. категории и т.п.)
    deleted_at         TIMESTAMPTZ NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by         UUID        NULL,
    updated_by         UUID        NULL,
    CONSTRAINT ck_user_profiles_gender CHECK (gender IS NULL OR gender IN ('M','F')),
    CONSTRAINT ck_user_profiles_iin_short CHECK (iin_short IS NULL OR iin_short ~ '^[0-9]{4}$')
);

COMMENT ON TABLE iam.user_profiles IS 'Персональные данные пользователя (1:1 с users). Маскирование: полный ИИН не дублируется, только последние 4 цифры.';
COMMENT ON COLUMN iam.user_profiles.extra IS 'JSONB для гибких полей профиля. Поиск по нему — через GIN.';

CREATE INDEX idx_user_profiles_iin_short ON iam.user_profiles (iin_short);
CREATE INDEX idx_user_profiles_extra ON iam.user_profiles USING GIN (extra jsonb_path_ops);

CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON iam.user_profiles
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- iam.user_identities — привязки к внешним IdP/способам входа
-- =====================================================================
CREATE TABLE iam.user_identities (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id           BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    provider          iam.identity_provider NOT NULL,
    subject           VARCHAR(255) NOT NULL,                      -- sub в провайдере (eGov Mobile / NCALayer cert DN и т.д.)
    status            iam.identity_status NOT NULL DEFAULT 'LINKED',
    certificate_serial VARCHAR(128) NULL,                         -- серийный номер сертификата ЭЦП (для NCALayer)
    certificate_issuer VARCHAR(255) NULL,
    last_used_at      TIMESTAMPTZ  NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by        UUID         NULL,
    updated_by        UUID         NULL,
    CONSTRAINT uq_user_identities_provider_subject UNIQUE (provider, subject)
);

COMMENT ON TABLE iam.user_identities IS 'Связь пользователя с внешними учётными записями/способами входа (eGov Mobile, NCALayer/ЭЦП, LMS).';

CREATE INDEX idx_user_identities_user ON iam.user_identities (user_id);

CREATE TRIGGER trg_user_identities_updated_at BEFORE UPDATE ON iam.user_identities
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- iam.user_roles — роли пользователя (Keycloak — источник истины, здесь проекция)
-- =====================================================================
CREATE TABLE iam.user_roles (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id   BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    role      iam.role_type NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID        NULL,
    CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role)
);

COMMENT ON TABLE iam.user_roles IS 'Роли пользователя. Авторитетный источник — Keycloak; таблица — денормализованная проекция для FK/проверок в доменных сервисах.';

CREATE INDEX idx_user_roles_role ON iam.user_roles (role);

-- =====================================================================
-- iam.user_consents — согласия на обработку ПДн (юридически обязательны)
-- =====================================================================
CREATE TABLE iam.user_consents (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    scope       iam.consent_scope NOT NULL,
    status      iam.consent_status NOT NULL DEFAULT 'GRANTED',
    version     VARCHAR(16) NOT NULL,                             -- версия текста согласия
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ NULL,
    ip_address  INET        NULL,
    user_agent  TEXT        NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  UUID        NULL,
    updated_by  UUID        NULL
);

COMMENT ON TABLE iam.user_consents IS 'Журнал согласий на обработку персональных данных (ЗРК «О персональных данных и их защите»).';

CREATE INDEX idx_user_consents_user ON iam.user_consents (user_id);

CREATE TRIGGER trg_user_consents_updated_at BEFORE UPDATE ON iam.user_consents
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- iam.external_data_imports — импорт данных по ИИН из гос. баз
-- =====================================================================
CREATE TABLE iam.external_data_imports (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id         BIGINT      NULL REFERENCES iam.users(id) ON DELETE SET NULL,
    iin_token       CHAR(64)    NOT NULL,                         -- HMAC-токен ИИН, по которому шёл импорт
    source          iam.import_source NOT NULL,
    status          iam.import_status NOT NULL DEFAULT 'PENDING',
    request_id      VARCHAR(64) NULL,                             -- id запроса во внешней системе
    payload         JSONB       NOT NULL DEFAULT '{}'::jsonb,     -- нормализованные данные (пейлоад)
    error_message   TEXT        NULL,
    error_code      VARCHAR(64) NULL,
    retry_count     INTEGER     NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ NULL,
    completed_at    TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID        NULL,
    updated_by      UUID        NULL,
    CONSTRAINT ck_external_data_imports_retry CHECK (retry_count >= 0)
);

COMMENT ON TABLE iam.external_data_imports IS 'Журнал импортов данных по ИИН (Smart Data Ukimet / НОБД / ГБД). Сырые пейлоады — в JSONB.';
COMMENT ON COLUMN iam.external_data_imports.payload IS 'Нормализованные данные импорта (JSONB), поиск — GIN.';

CREATE INDEX idx_external_data_imports_user      ON iam.external_data_imports (user_id);
CREATE INDEX idx_external_data_imports_iin_token ON iam.external_data_imports (iin_token);
CREATE INDEX idx_external_data_imports_status    ON iam.external_data_imports (status);
CREATE INDEX idx_external_data_imports_payload   ON iam.external_data_imports USING GIN (payload jsonb_path_ops);

CREATE TRIGGER trg_external_data_imports_updated_at BEFORE UPDATE ON iam.external_data_imports
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();
