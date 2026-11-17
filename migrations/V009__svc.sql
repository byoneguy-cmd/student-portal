-- =====================================================================
-- V009 — University Services
-- Источник: docs/02-database.md, раздел 3.8
-- =====================================================================

-- =====================================================================
-- svc.certificates — справки (заявка и выдача подписанного PDF)
-- =====================================================================
CREATE TABLE svc.certificates (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id      UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id        BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    cert_type      svc.certificate_type NOT NULL,
    status         svc.certificate_status NOT NULL DEFAULT 'REQUESTED',
    document_id    BIGINT      NULL REFERENCES doc.documents(id) ON DELETE SET NULL,  -- подписанный PDF
    purpose        TEXT        NULL,
    requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    issued_at      TIMESTAMPTZ NULL,
    expires_at     TIMESTAMPTZ NULL,
    rejected_reason TEXT       NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by     UUID        NULL,
    updated_by     UUID        NULL
);

COMMENT ON TABLE svc.certificates IS 'Заявка/выдача справки (с места учёбы и др.), подписанной серверной ЭЦП вуза.';

CREATE INDEX idx_certificates_user   ON svc.certificates (user_id);
CREATE INDEX idx_certificates_status ON svc.certificates (status);
CREATE INDEX idx_certificates_type   ON svc.certificates (cert_type);

CREATE TRIGGER trg_certificates_updated_at BEFORE UPDATE ON svc.certificates
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- svc.payment_invoices — счета на оплату (обучение, общежитие)
-- =====================================================================
CREATE TABLE svc.payment_invoices (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id    UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id      BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(64) NOT NULL UNIQUE,
    title        VARCHAR(255) NOT NULL,
    amount       NUMERIC(14,2) NOT NULL,
    currency     CHAR(3)     NOT NULL DEFAULT 'KZT',
    status       svc.invoice_status NOT NULL DEFAULT 'ISSUED',
    description  TEXT        NULL,
    due_at       DATE        NULL,
    paid_at      TIMESTAMPTZ NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by   UUID        NULL,
    updated_by   UUID        NULL,
    CONSTRAINT ck_payment_invoices_amount CHECK (amount >= 0)
);

COMMENT ON TABLE svc.payment_invoices IS 'Счёт на оплату (обучение, общежитие). Погашается платежами svc.payments.';

CREATE INDEX idx_payment_invoices_user   ON svc.payment_invoices (user_id);
CREATE INDEX idx_payment_invoices_status ON svc.payment_invoices (status);

CREATE TRIGGER trg_payment_invoices_updated_at BEFORE UPDATE ON svc.payment_invoices
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- svc.payments — платежи
-- =====================================================================
CREATE TABLE svc.payments (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    invoice_id      BIGINT      NOT NULL REFERENCES svc.payment_invoices(id) ON DELETE RESTRICT,
    user_id         BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    amount          NUMERIC(14,2) NOT NULL,
    currency        CHAR(3)     NOT NULL DEFAULT 'KZT',
    status          svc.payment_status NOT NULL DEFAULT 'CREATED',
    method          svc.payment_method NOT NULL DEFAULT 'CARD',
    provider        VARCHAR(32) NULL,                             -- e.g. HALYK, EGOV_PAY
    provider_payment_id VARCHAR(128) NULL,
    provider_response JSONB    NULL,
    idempotency_key VARCHAR(128) NULL,
    paid_at         TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID        NULL,
    updated_by      UUID        NULL,
    CONSTRAINT ck_payments_amount CHECK (amount > 0)
);

COMMENT ON TABLE svc.payments IS 'Платёж по счёту. Идемпотентность — через idempotency_key и ops.idempotency_keys.';

CREATE INDEX idx_payments_invoice ON svc.payments (invoice_id);
CREATE INDEX idx_payments_user    ON svc.payments (user_id);
CREATE INDEX idx_payments_status  ON svc.payments (status);
CREATE INDEX idx_payments_provider ON svc.payments (provider, provider_payment_id);

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON svc.payments
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();
