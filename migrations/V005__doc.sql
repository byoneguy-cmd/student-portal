-- =====================================================================
-- V005 — Document & Signature
-- Источник: docs/02-database.md, раздел 3.4
-- =====================================================================

-- =====================================================================
-- doc.documents — метаданные документов (файлы — в MinIO)
-- =====================================================================
CREATE TABLE doc.documents (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id         UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    owner_user_id     BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    doc_type          doc.document_type NOT NULL,
    status            doc.document_status NOT NULL DEFAULT 'DRAFT',
    title             VARCHAR(255) NOT NULL,
    description       TEXT        NULL,
    mime_type         VARCHAR(128) NOT NULL DEFAULT 'application/pdf',
    storage_bucket    VARCHAR(255) NOT NULL,                      -- MinIO bucket
    storage_key       VARCHAR(1024) NOT NULL,                     -- object key в MinIO
    storage_checksum  CHAR(64)    NOT NULL,                       -- SHA-256 файла (целостность)
    storage_size_bytes BIGINT     NULL,
    original_filename VARCHAR(512) NULL,
    template_id       VARCHAR(64) NULL,                           -- id шаблона генерации
    metadata          JSONB       NOT NULL DEFAULT '{}'::jsonb,   -- гибкие метаданные
    signed_at         TIMESTAMPTZ NULL,
    expires_at        TIMESTAMPTZ NULL,
    version           INTEGER     NOT NULL DEFAULT 1,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID        NULL,
    updated_by        UUID        NULL,
    CONSTRAINT uq_documents_storage UNIQUE (storage_bucket, storage_key),
    CONSTRAINT ck_documents_checksum CHECK (storage_checksum ~ '^[0-9a-f]{64}$')
);

COMMENT ON TABLE doc.documents IS 'Метаданные документов. Бинарные файлы хранятся в MinIO; в БД — только метаданные, bucket/key и хэши.';
COMMENT ON COLUMN doc.documents.storage_checksum IS 'SHA-256 содержимого файла — контроль целостности при чтении из MinIO.';

CREATE INDEX idx_documents_owner       ON doc.documents (owner_user_id);
CREATE INDEX idx_documents_type_status ON doc.documents (doc_type, status);
CREATE INDEX idx_documents_created_at  ON doc.documents (created_at DESC);
CREATE INDEX idx_documents_metadata    ON doc.documents USING GIN (metadata jsonb_path_ops);

CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON doc.documents
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- doc.document_packages — пакеты документов для пакетного подписания
-- =====================================================================
CREATE TABLE doc.document_packages (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id   UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    title       VARCHAR(255) NOT NULL,
    description TEXT        NULL,
    status      doc.package_status NOT NULL DEFAULT 'DRAFT',
    context     JSONB       NOT NULL DEFAULT '{}'::jsonb,         -- контекст пакета (заселение, контракт и т.п.)
    signed_at   TIMESTAMPTZ NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  UUID        NULL,
    updated_by  UUID        NULL
);

COMMENT ON TABLE doc.document_packages IS 'Пакет документов, подписываемый единой транзакцией (например, пакет заселения: договор + акт + согласие).';

CREATE INDEX idx_document_packages_status ON doc.document_packages (status);

CREATE TRIGGER trg_document_packages_updated_at BEFORE UPDATE ON doc.document_packages
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- doc.document_package_items — состав пакета (many-to-many)
-- =====================================================================
CREATE TABLE doc.document_package_items (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    package_id BIGINT   NOT NULL REFERENCES doc.document_packages(id) ON DELETE CASCADE,
    document_id BIGINT  NOT NULL REFERENCES doc.documents(id) ON DELETE RESTRICT,
    position   INTEGER  NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_document_package_items UNIQUE (package_id, document_id)
);

COMMENT ON TABLE doc.document_package_items IS 'Связь «пакет ↔ документ» с порядком подписания (position).';

CREATE INDEX idx_document_package_items_document ON doc.document_package_items (document_id);

-- =====================================================================
-- doc.document_signatures — подписи документов/пакетов (CAdES/XAdES/PAdES)
-- =====================================================================
CREATE TABLE doc.document_signatures (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id        UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    document_id      BIGINT      NULL REFERENCES doc.documents(id) ON DELETE CASCADE,
    package_id       BIGINT      NULL REFERENCES doc.document_packages(id) ON DELETE CASCADE,
    signer_user_id   BIGINT      NULL REFERENCES iam.users(id) ON DELETE SET NULL,
    signer_type      doc.signer_type NOT NULL DEFAULT 'USER',
    signature_format doc.signature_format NOT NULL DEFAULT 'CADES',
    status           doc.signature_status NOT NULL DEFAULT 'PENDING',
    signature_value  TEXT        NULL,                            -- CMS/XML DSig в base64
    certificate_info JSONB       NOT NULL DEFAULT '{}'::jsonb,    -- сертификат, issuer, subject, validity
    ocsp_status      VARCHAR(32) NULL,                            -- GOOD/REVOKED/UNKNOWN
    ocsp_checked_at  TIMESTAMPTZ NULL,
    signature_checksum CHAR(64) NULL,                             -- хэш подписанного файла
    signed_at        TIMESTAMPTZ NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by       UUID        NULL,
    updated_by       UUID        NULL,
    CONSTRAINT ck_document_signatures_target CHECK (document_id IS NOT NULL OR package_id IS NOT NULL)
);

COMMENT ON TABLE doc.document_signatures IS 'Электронные подписи (ЭЦП). Пользовательские — NCALayer/eGov Mobile; вузовские — серверная ЭЦП (HSM).';
COMMENT ON COLUMN doc.document_signatures.certificate_info IS 'JSONB с деталями сертификата (subject, issuer, serial, validity).';

CREATE INDEX idx_document_signatures_document ON doc.document_signatures (document_id);
CREATE INDEX idx_document_signatures_package  ON doc.document_signatures (package_id);
CREATE INDEX idx_document_signatures_signer   ON doc.document_signatures (signer_user_id);
CREATE INDEX idx_document_signatures_status   ON doc.document_signatures (status);

CREATE TRIGGER trg_document_signatures_updated_at BEFORE UPDATE ON doc.document_signatures
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- doc.hash_chain — цепочка хэшей (hash-chain) для гарантии целостности архива
-- =====================================================================
CREATE TABLE doc.hash_chain (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_hash     CHAR(64)    NOT NULL UNIQUE,                   -- SHA-256 текущего звена
    prev_hash      CHAR(64)    NULL REFERENCES doc.hash_chain(entry_hash) ON DELETE RESTRICT,
    document_id    BIGINT      NULL REFERENCES doc.documents(id) ON DELETE CASCADE,
    package_id     BIGINT      NULL REFERENCES doc.document_packages(id) ON DELETE CASCADE,
    position       INTEGER     NOT NULL DEFAULT 0,
    algorithm      doc.hash_algorithm NOT NULL DEFAULT 'SHA-256',
    payload_ref    TEXT        NULL,                              -- ссылка/описание якоря (storage_key, метаданные)
    metadata       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by     UUID        NULL,
    CONSTRAINT ck_hash_chain_scope CHECK (document_id IS NOT NULL OR package_id IS NOT NULL),
    CONSTRAINT ck_hash_chain_position CHECK (position >= 0),
    CONSTRAINT ck_hash_chain_hash CHECK (entry_hash ~ '^[0-9a-f]{64}$')
);

COMMENT ON TABLE doc.hash_chain IS 'Hash-chain: каждое звено = SHA-256(предыдущий_hash || payload). Гарантирует неотказуемость и целостность архива документов.';
COMMENT ON COLUMN doc.hash_chain.prev_hash IS 'Ссылка на предыдущее звено цепочки; NULL только у генезис-звена (position=0).';

CREATE INDEX idx_hash_chain_document ON doc.hash_chain (document_id);
CREATE INDEX idx_hash_chain_package  ON doc.hash_chain (package_id);
CREATE INDEX idx_hash_chain_position ON doc.hash_chain (document_id, position);
