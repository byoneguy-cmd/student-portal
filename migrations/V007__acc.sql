-- =====================================================================
-- V007 — Accommodation
-- Источник: docs/02-database.md, раздел 3.6
-- (FK academic_term_id → acad.academic_terms добавляется в V008, раздел 3.9)
-- =====================================================================

-- =====================================================================
-- acc.dormitories — общежития
-- =====================================================================
CREATE TABLE acc.dormitories (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id     UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    code          VARCHAR(32) NOT NULL UNIQUE,
    name_ru       VARCHAR(255) NOT NULL,
    name_kz       VARCHAR(255) NOT NULL,
    address       TEXT        NOT NULL,
    status        acc.dormitory_status NOT NULL DEFAULT 'ACTIVE',
    gender_policy acc.gender_policy NOT NULL DEFAULT 'ANY',
    total_capacity INTEGER    NOT NULL DEFAULT 0,
    admin_user_id BIGINT      NULL REFERENCES iam.users(id) ON DELETE SET NULL, -- комендант/администратор
    metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by    UUID        NULL,
    updated_by    UUID        NULL,
    CONSTRAINT ck_dormitories_capacity CHECK (total_capacity >= 0)
);

COMMENT ON TABLE acc.dormitories IS 'Общежитие (dormitory). Атрибуты: адрес, вместимость, гендерная политика, ответственный.';

CREATE INDEX idx_dormitories_status ON acc.dormitories (status);

CREATE TRIGGER trg_dormitories_updated_at BEFORE UPDATE ON acc.dormitories
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acc.room_types — справочник категорий комнат
-- =====================================================================
CREATE TABLE acc.room_types (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(64)  NOT NULL UNIQUE,                     -- e.g. STANDARD, IMPROVED, SUITE, ACCESSIBLE
    name_ru     VARCHAR(255) NOT NULL,
    name_kz     VARCHAR(255) NOT NULL,
    capacity    INTEGER      NOT NULL DEFAULT 2,
    monthly_fee NUMERIC(14,2) NULL,                               -- ставка найма, тенге/мес
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_room_types_capacity CHECK (capacity > 0),
    CONSTRAINT ck_room_types_fee CHECK (monthly_fee IS NULL OR monthly_fee >= 0)
);

COMMENT ON TABLE acc.room_types IS 'Категории комнат (стандарт, улучшенная, люкс, доступная для МГН) с тарифом найма.';

CREATE TRIGGER trg_room_types_updated_at BEFORE UPDATE ON acc.room_types
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acc.rooms — комнаты
-- =====================================================================
CREATE TABLE acc.rooms (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id    UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    dormitory_id BIGINT      NOT NULL REFERENCES acc.dormitories(id) ON DELETE RESTRICT,
    room_type_id BIGINT      NOT NULL REFERENCES acc.room_types(id) ON DELETE RESTRICT,
    room_number  VARCHAR(32) NOT NULL,
    floor        INTEGER     NULL,
    status       acc.room_status NOT NULL DEFAULT 'FREE',
    capacity     INTEGER     NOT NULL DEFAULT 2,
    occupied     INTEGER     NOT NULL DEFAULT 0,                  -- денормализованный счётчик проживающих
    metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by   UUID        NULL,
    updated_by   UUID        NULL,
    CONSTRAINT uq_rooms_dormitory_number UNIQUE (dormitory_id, room_number),
    CONSTRAINT ck_rooms_capacity CHECK (capacity > 0),
    CONSTRAINT ck_rooms_occupied CHECK (occupied >= 0 AND occupied <= capacity)
);

COMMENT ON TABLE acc.rooms IS 'Комната общежития. `occupied` — денормализованный счётчик, поддерживается триггером/сервисом.';

CREATE INDEX idx_rooms_dormitory ON acc.rooms (dormitory_id);
CREATE INDEX idx_rooms_type       ON acc.rooms (room_type_id);
CREATE INDEX idx_rooms_status     ON acc.rooms (status);

CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON acc.rooms
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acc.accommodation_applications — заявки на заселение
-- =====================================================================
CREATE TABLE acc.accommodation_applications (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id            UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id              BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    academic_term_id     BIGINT      NULL,                        -- заполняется после создания acad.academic_terms
    preferred_dormitory_id BIGINT    NULL REFERENCES acc.dormitories(id) ON DELETE SET NULL,
    preferred_room_id    BIGINT      NULL REFERENCES acc.rooms(id) ON DELETE SET NULL,
    eligibility_id       BIGINT      NULL REFERENCES social.social_benefit_eligibilities(id) ON DELETE SET NULL,
    status               acc.application_status NOT NULL DEFAULT 'DRAFT',
    priority             INTEGER     NOT NULL DEFAULT 0,          -- приоритет при распределении (льготы повышают)
    queue_position       INTEGER     NULL,
    submitted_at         TIMESTAMPTZ NULL,
    decided_at           TIMESTAMPTZ NULL,
    decided_by           UUID        NULL,
    rejection_reason     TEXT        NULL,
    metadata             JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           UUID        NULL,
    updated_by           UUID        NULL
);

COMMENT ON TABLE acc.accommodation_applications IS 'Заявка студента на место в общежитии. Приоритет учитывает подтверждённые льготы.';

CREATE INDEX idx_accommodation_applications_user    ON acc.accommodation_applications (user_id);
CREATE INDEX idx_accommodation_applications_status  ON acc.accommodation_applications (status);
CREATE INDEX idx_accommodation_applications_dorm    ON acc.accommodation_applications (preferred_dormitory_id);
CREATE INDEX idx_accommodation_applications_elig    ON acc.accommodation_applications (eligibility_id);

CREATE TRIGGER trg_accommodation_applications_updated_at BEFORE UPDATE ON acc.accommodation_applications
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acc.room_allocations — выделенные места (заселение)
-- =====================================================================
CREATE TABLE acc.room_allocations (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id              UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    application_id         BIGINT      NOT NULL REFERENCES acc.accommodation_applications(id) ON DELETE RESTRICT,
    room_id                BIGINT      NOT NULL REFERENCES acc.rooms(id) ON DELETE RESTRICT,
    user_id                BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    status                 acc.allocation_status NOT NULL DEFAULT 'PENDING_MOVE_IN',
    lease_contract_document_id BIGINT  NULL REFERENCES doc.documents(id) ON DELETE RESTRICT,  -- договор найма
    handover_act_document_id   BIGINT  NULL REFERENCES doc.documents(id) ON DELETE RESTRICT,  -- акт приёма-передачи
    contract_terms         JSONB       NOT NULL DEFAULT '{}'::jsonb, -- срок, ставка, условия
    check_in_date          DATE        NULL,
    check_out_date         DATE        NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by             UUID        NULL,
    updated_by             UUID        NULL,
    CONSTRAINT ck_room_allocations_dates CHECK (check_in_date IS NULL OR check_out_date IS NULL OR check_out_date > check_in_date)
);

COMMENT ON TABLE acc.room_allocations IS 'Выделенное место/комната конкретному студенту. Договор найма и акт — это документы в doc.documents.';
COMMENT ON COLUMN acc.room_allocations.contract_terms IS 'Финансовые/сроковые условия договора (JSONB): срок, ставка, депозит.';

CREATE INDEX idx_room_allocations_user        ON acc.room_allocations (user_id);
CREATE INDEX idx_room_allocations_room        ON acc.room_allocations (room_id);
CREATE INDEX idx_room_allocations_status      ON acc.room_allocations (status);
CREATE INDEX idx_room_allocations_application ON acc.room_allocations (application_id);

-- Частичный уникальный индекс: у студента не более одной активной аллокации
CREATE UNIQUE INDEX uq_room_allocations_active_user
    ON acc.room_allocations (user_id)
    WHERE status IN ('PENDING_MOVE_IN','ACTIVE');

CREATE TRIGGER trg_room_allocations_updated_at BEFORE UPDATE ON acc.room_allocations
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();
