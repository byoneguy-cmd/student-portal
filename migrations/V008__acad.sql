-- =====================================================================
-- V008 — Academic (LMS) + отложенный FK
-- Источник: docs/02-database.md, разделы 3.7 и 3.9
-- =====================================================================

-- =====================================================================
-- acad.academic_terms — учебные периоды (семестры)
-- =====================================================================
CREATE TABLE acad.academic_terms (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id   UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    code        VARCHAR(64) NOT NULL UNIQUE,                      -- e.g. 2026-FALL
    name_ru     VARCHAR(255) NOT NULL,
    name_kz     VARCHAR(255) NOT NULL,
    term_type   acad.term_type NOT NULL DEFAULT 'SEMESTER',
    academic_year VARCHAR(16) NOT NULL,                           -- e.g. 2026-2027
    starts_on   DATE        NOT NULL,
    ends_on     DATE        NOT NULL,
    is_current  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  UUID        NULL,
    updated_by  UUID        NULL,
    CONSTRAINT ck_academic_terms_dates CHECK (ends_on > starts_on)
);

COMMENT ON TABLE acad.academic_terms IS 'Учебный период (семестр/триместр). Используется всеми академическими сущностями.';

CREATE INDEX idx_academic_terms_dates ON acad.academic_terms (starts_on, ends_on);

CREATE TRIGGER trg_academic_terms_updated_at BEFORE UPDATE ON acad.academic_terms
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.courses — учебные дисциплины (справочник)
-- =====================================================================
CREATE TABLE acad.courses (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id     UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    code          VARCHAR(64) NOT NULL UNIQUE,
    name_ru       VARCHAR(255) NOT NULL,
    name_kz       VARCHAR(255) NOT NULL,
    credits_ects  NUMERIC(4,1) NULL,
    description   TEXT        NULL,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at    TIMESTAMPTZ NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by    UUID        NULL,
    updated_by    UUID        NULL,
    CONSTRAINT ck_courses_ects CHECK (credits_ects IS NULL OR credits_ects > 0)
);

COMMENT ON TABLE acad.courses IS 'Справочник учебных дисциплин (курсов).';

CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON acad.courses
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.course_instances — реализация курса в конкретном семестре
-- =====================================================================
CREATE TABLE acad.course_instances (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    course_id       BIGINT      NOT NULL REFERENCES acad.courses(id) ON DELETE RESTRICT,
    term_id         BIGINT      NOT NULL REFERENCES acad.academic_terms(id) ON DELETE RESTRICT,
    lecturer_user_id BIGINT     NULL REFERENCES iam.users(id) ON DELETE SET NULL,
    section         VARCHAR(32) NOT NULL DEFAULT 'A',             -- группа/поток
    capacity        INTEGER     NULL,
    is_elective     BOOLEAN     NOT NULL DEFAULT FALSE,
    external_lms_id VARCHAR(64) NULL,                             -- id в Platonus/1С на переходный период
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID        NULL,
    updated_by      UUID        NULL,
    CONSTRAINT uq_course_instances UNIQUE (course_id, term_id, section),
    CONSTRAINT ck_course_instances_capacity CHECK (capacity IS NULL OR capacity > 0)
);

COMMENT ON TABLE acad.course_instances IS 'Реализация дисциплины в конкретном семестре (поток/секция).';

CREATE INDEX idx_course_instances_term     ON acad.course_instances (term_id);
CREATE INDEX idx_course_instances_lecturer ON acad.course_instances (lecturer_user_id);
CREATE INDEX idx_course_instances_ext      ON acad.course_instances (external_lms_id);

CREATE TRIGGER trg_course_instances_updated_at BEFORE UPDATE ON acad.course_instances
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.enrollments — запись студента на курс
-- =====================================================================
CREATE TABLE acad.enrollments (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id         UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    course_instance_id BIGINT     NOT NULL REFERENCES acad.course_instances(id) ON DELETE RESTRICT,
    student_user_id   BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    status            acad.enrollment_status NOT NULL DEFAULT 'ACTIVE',
    enrolled_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    dropped_at        TIMESTAMPTZ NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID        NULL,
    updated_by        UUID        NULL,
    CONSTRAINT uq_enrollments UNIQUE (course_instance_id, student_user_id)
);

COMMENT ON TABLE acad.enrollments IS 'Запись студента на курс (enrollment). Базис для оценок и GPA.';

CREATE INDEX idx_enrollments_student ON acad.enrollments (student_user_id);
CREATE INDEX idx_enrollments_status  ON acad.enrollments (status);

CREATE TRIGGER trg_enrollments_updated_at BEFORE UPDATE ON acad.enrollments
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.schedules — расписание группы/курса на семестр
-- =====================================================================
CREATE TABLE acad.schedules (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id         UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    course_instance_id BIGINT     NOT NULL REFERENCES acad.course_instances(id) ON DELETE CASCADE,
    term_id           BIGINT      NOT NULL REFERENCES acad.academic_terms(id) ON DELETE RESTRICT,
    title             VARCHAR(255) NOT NULL,
    is_published      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID        NULL,
    updated_by        UUID        NULL
);

COMMENT ON TABLE acad.schedules IS 'Расписание занятий (шапка) для курса/потока в семестре.';

CREATE INDEX idx_schedules_course ON acad.schedules (course_instance_id);
CREATE INDEX idx_schedules_term   ON acad.schedules (term_id);

CREATE TRIGGER trg_schedules_updated_at BEFORE UPDATE ON acad.schedules
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.schedule_entries — конкретные занятия
-- =====================================================================
CREATE TABLE acad.schedule_entries (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    schedule_id  BIGINT      NOT NULL REFERENCES acad.schedules(id) ON DELETE CASCADE,
    weekday      acad.weekday NOT NULL,
    start_time   TIME        NOT NULL,
    end_time     TIME        NOT NULL,
    entry_type   acad.schedule_entry_type NOT NULL DEFAULT 'LECTURE',
    location     VARCHAR(255) NULL,                               -- аудитория (не связана с комнатами общежития)
    lecturer_user_id BIGINT  NULL REFERENCES iam.users(id) ON DELETE SET NULL,
    recurrence   JSONB       NOT NULL DEFAULT '{}'::jsonb,        -- e.g. {weeks:[1,2,3], biweekly:true}
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by   UUID        NULL,
    updated_by   UUID        NULL,
    CONSTRAINT ck_schedule_entries_time CHECK (end_time > start_time)
);

COMMENT ON TABLE acad.schedule_entries IS 'Отдельное занятие в расписании (день недели + время + аудитория + периодичность).';

CREATE INDEX idx_schedule_entries_schedule ON acad.schedule_entries (schedule_id);
CREATE INDEX idx_schedule_entries_weekday  ON acad.schedule_entries (weekday, start_time);

CREATE TRIGGER trg_schedule_entries_updated_at BEFORE UPDATE ON acad.schedule_entries
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.grade_components — компоненты итоговой оценки (веса)
-- =====================================================================
CREATE TABLE acad.grade_components (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_instance_id BIGINT     NOT NULL REFERENCES acad.course_instances(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,                      -- e.g. "Midterm", "Final", "Attendance"
    weight            NUMERIC(5,2) NOT NULL,                      -- вес в % (0–100)
    max_points        NUMERIC(7,2) NOT NULL,
    is_final          BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order        INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_grade_components_weight CHECK (weight >= 0 AND weight <= 100),
    CONSTRAINT ck_grade_components_max CHECK (max_points > 0)
);

COMMENT ON TABLE acad.grade_components IS 'Компоненты итоговой оценки курса (вес каждого компонента).';

CREATE INDEX idx_grade_components_course ON acad.grade_components (course_instance_id);

CREATE TRIGGER trg_grade_components_updated_at BEFORE UPDATE ON acad.grade_components
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.grades — оценки студентов
-- =====================================================================
CREATE TABLE acad.grades (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id         UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    enrollment_id     BIGINT      NOT NULL REFERENCES acad.enrollments(id) ON DELETE CASCADE,
    grade_component_id BIGINT     NULL REFERENCES acad.grade_components(id) ON DELETE CASCADE, -- NULL = итоговая
    points            NUMERIC(7,2) NULL,
    max_points        NUMERIC(7,2) NULL,
    percentage        NUMERIC(6,2) NULL,
    letter_grade      CHAR(2)     NULL,                           -- A, A-, B+, ...
    gpa_points        NUMERIC(4,2) NULL,                          -- балл GPA (4.0 / 5.0 шкала)
    status            acad.grade_status NOT NULL DEFAULT 'PENDING',
    recorded_by       BIGINT      NULL REFERENCES iam.users(id) ON DELETE SET NULL,
    recorded_at       TIMESTAMPTZ NULL,
    external_lms_id   VARCHAR(64) NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID        NULL,
    updated_by        UUID        NULL,
    CONSTRAINT ck_grades_points CHECK (points IS NULL OR points >= 0),
    CONSTRAINT ck_grades_percentage CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
    CONSTRAINT ck_grades_gpa CHECK (gpa_points IS NULL OR (gpa_points >= 0 AND gpa_points <= 5))
);

COMMENT ON TABLE acad.grades IS 'Оценка студента: по компоненту (grade_component_id) или итоговая (NULL). GPA считается агрегацией.';
COMMENT ON COLUMN acad.grades.letter_grade IS 'Буквенная оценка (A, A-, B+, ...). Шкала задаётся конфигурацией вуза.';

CREATE INDEX idx_grades_enrollment  ON acad.grades (enrollment_id);
CREATE INDEX idx_grades_component   ON acad.grades (grade_component_id);
CREATE INDEX idx_grades_status      ON acad.grades (status);

-- Частичный уникальный индекс: одна итоговая оценка на enrollment
CREATE UNIQUE INDEX uq_grades_final_per_enrollment
    ON acad.grades (enrollment_id)
    WHERE grade_component_id IS NULL;

CREATE TRIGGER trg_grades_updated_at BEFORE UPDATE ON acad.grades
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.transcripts — транскрипты (выписки)
-- =====================================================================
CREATE TABLE acad.transcripts (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id   UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    student_user_id BIGINT  NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    term_id     BIGINT      NULL REFERENCES acad.academic_terms(id) ON DELETE SET NULL,
    document_id BIGINT      NULL REFERENCES doc.documents(id) ON DELETE SET NULL,  -- подписанный PDF
    gpa_total   NUMERIC(5,3) NULL,
    credits_total NUMERIC(6,1) NULL,
    status      doc.document_status NOT NULL DEFAULT 'DRAFT',
    issued_at   TIMESTAMPTZ NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  UUID        NULL,
    updated_by  UUID        NULL,
    CONSTRAINT ck_transcripts_gpa CHECK (gpa_total IS NULL OR (gpa_total >= 0 AND gpa_total <= 5))
);

COMMENT ON TABLE acad.transcripts IS 'Транскрипт студента (сводная выписка успеваемости). Подписанный PDF — в doc.documents.';

CREATE INDEX idx_transcripts_student ON acad.transcripts (student_user_id);
CREATE INDEX idx_transcripts_term    ON acad.transcripts (term_id);

CREATE TRIGGER trg_transcripts_updated_at BEFORE UPDATE ON acad.transcripts
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.transcript_items — строки транскрипта
-- =====================================================================
CREATE TABLE acad.transcript_items (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transcript_id      BIGINT      NOT NULL REFERENCES acad.transcripts(id) ON DELETE CASCADE,
    course_instance_id BIGINT      NULL REFERENCES acad.course_instances(id) ON DELETE SET NULL,
    grade_id           BIGINT      NULL REFERENCES acad.grades(id) ON DELETE SET NULL,
    course_code        VARCHAR(64) NOT NULL,
    course_name        VARCHAR(255) NOT NULL,
    credits_ects       NUMERIC(4,1) NULL,
    letter_grade       CHAR(2)     NULL,
    gpa_points         NUMERIC(4,2) NULL,
    CONSTRAINT uq_transcript_items UNIQUE (transcript_id, course_instance_id)
);

COMMENT ON TABLE acad.transcript_items IS 'Строка транскрипта: снапшот результата по курсу на момент выдачи.';

CREATE INDEX idx_transcript_items_transcript ON acad.transcript_items (transcript_id);

-- =====================================================================
-- acad.appeals — апелляции на оценки
-- =====================================================================
CREATE TABLE acad.appeals (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id    UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    grade_id     BIGINT      NOT NULL REFERENCES acad.grades(id) ON DELETE RESTRICT,
    student_user_id BIGINT   NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    reviewer_user_id BIGINT  NULL REFERENCES iam.users(id) ON DELETE SET NULL,
    status       acad.appeal_status NOT NULL DEFAULT 'SUBMITTED',
    reason       TEXT        NOT NULL,
    decision     TEXT        NULL,
    decided_at   TIMESTAMPTZ NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by   UUID        NULL,
    updated_by   UUID        NULL
);

COMMENT ON TABLE acad.appeals IS 'Апелляция студента на выставленную оценку.';

CREATE INDEX idx_appeals_grade   ON acad.appeals (grade_id);
CREATE INDEX idx_appeals_student ON acad.appeals (student_user_id);
CREATE INDEX idx_appeals_status  ON acad.appeals (status);

CREATE TRIGGER trg_appeals_updated_at BEFORE UPDATE ON acad.appeals
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.electives — элективные курсы (выбор студентом)
-- =====================================================================
CREATE TABLE acad.electives (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id         UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    course_instance_id BIGINT     NOT NULL REFERENCES acad.course_instances(id) ON DELETE CASCADE,
    term_id           BIGINT      NOT NULL REFERENCES acad.academic_terms(id) ON DELETE RESTRICT,
    status            acad.elective_status NOT NULL DEFAULT 'OPEN',
    max_students      INTEGER     NULL,
    enrolled_count    INTEGER     NOT NULL DEFAULT 0,
    registration_deadline TIMESTAMPTZ NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID        NULL,
    updated_by        UUID        NULL,
    CONSTRAINT ck_electives_max CHECK (max_students IS NULL OR max_students > 0),
    CONSTRAINT ck_electives_enrolled CHECK (enrolled_count >= 0)
);

COMMENT ON TABLE acad.electives IS 'Элективный курс с квотой и дедлайном записи.';

CREATE INDEX idx_electives_term   ON acad.electives (term_id);
CREATE INDEX idx_electives_status ON acad.electives (status);

CREATE TRIGGER trg_electives_updated_at BEFORE UPDATE ON acad.electives
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.assignments — домашние задания
-- =====================================================================
CREATE TABLE acad.assignments (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id         UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    course_instance_id BIGINT     NOT NULL REFERENCES acad.course_instances(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    description       TEXT        NULL,
    max_points        NUMERIC(7,2) NULL,
    opens_at          TIMESTAMPTZ NULL,
    due_at            TIMESTAMPTZ NULL,
    closes_at         TIMESTAMPTZ NULL,
    is_published      BOOLEAN     NOT NULL DEFAULT FALSE,
    attachments       JSONB       NOT NULL DEFAULT '[]'::jsonb,   -- [{bucket, key, checksum}]
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID        NULL,
    updated_by        UUID        NULL
);

COMMENT ON TABLE acad.assignments IS 'Домашнее задание по курсу. Вложения — ссылки на MinIO (JSONB).';

CREATE INDEX idx_assignments_course ON acad.assignments (course_instance_id);
CREATE INDEX idx_assignments_due    ON acad.assignments (due_at);

CREATE TRIGGER trg_assignments_updated_at BEFORE UPDATE ON acad.assignments
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.submissions — сдачи ДЗ
-- =====================================================================
CREATE TABLE acad.submissions (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id      UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    assignment_id  BIGINT      NOT NULL REFERENCES acad.assignments(id) ON DELETE CASCADE,
    student_user_id BIGINT     NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    status         acad.submission_status NOT NULL DEFAULT 'NOT_SUBMITTED',
    submitted_at   TIMESTAMPTZ NULL,
    graded_at      TIMESTAMPTZ NULL,
    points         NUMERIC(7,2) NULL,
    feedback       TEXT        NULL,
    files          JSONB       NOT NULL DEFAULT '[]'::jsonb,      -- ссылки на MinIO
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by     UUID        NULL,
    updated_by     UUID        NULL,
    CONSTRAINT uq_submissions UNIQUE (assignment_id, student_user_id)
);

COMMENT ON TABLE acad.submissions IS 'Сдача домашнего задания студентом.';

CREATE INDEX idx_submissions_assignment ON acad.submissions (assignment_id);
CREATE INDEX idx_submissions_student    ON acad.submissions (student_user_id);
CREATE INDEX idx_submissions_status     ON acad.submissions (status);

CREATE TRIGGER trg_submissions_updated_at BEFORE UPDATE ON acad.submissions
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.quizzes — тесты
-- =====================================================================
CREATE TABLE acad.quizzes (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id         UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    course_instance_id BIGINT     NOT NULL REFERENCES acad.course_instances(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    description       TEXT        NULL,
    status            acad.quiz_status NOT NULL DEFAULT 'DRAFT',
    time_limit_seconds INTEGER    NULL,
    max_attempts      INTEGER     NULL,
    opens_at          TIMESTAMPTZ NULL,
    closes_at         TIMESTAMPTZ NULL,
    shuffle_questions BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID        NULL,
    updated_by        UUID        NULL,
    CONSTRAINT ck_quizzes_time CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),
    CONSTRAINT ck_quizzes_attempts CHECK (max_attempts IS NULL OR max_attempts > 0)
);

COMMENT ON TABLE acad.quizzes IS 'Тест/квиз по курсу.';

CREATE INDEX idx_quizzes_course ON acad.quizzes (course_instance_id);
CREATE INDEX idx_quizzes_status ON acad.quizzes (status);

CREATE TRIGGER trg_quizzes_updated_at BEFORE UPDATE ON acad.quizzes
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.quiz_questions — вопросы теста
-- =====================================================================
CREATE TABLE acad.quiz_questions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id       BIGINT      NOT NULL REFERENCES acad.quizzes(id) ON DELETE CASCADE,
    position      INTEGER     NOT NULL DEFAULT 0,
    question_type VARCHAR(32) NOT NULL DEFAULT 'single',          -- single/multiple/free_text
    prompt        TEXT        NOT NULL,
    options       JSONB       NOT NULL DEFAULT '[]'::jsonb,       -- варианты + корректные
    points        NUMERIC(6,2) NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_quiz_questions_points CHECK (points > 0)
);

COMMENT ON TABLE acad.quiz_questions IS 'Вопрос теста с вариантами ответов (JSONB).';

CREATE INDEX idx_quiz_questions_quiz ON acad.quiz_questions (quiz_id);

CREATE TRIGGER trg_quiz_questions_updated_at BEFORE UPDATE ON acad.quiz_questions
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.quiz_attempts — попытки прохождения теста
-- =====================================================================
CREATE TABLE acad.quiz_attempts (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id      UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    quiz_id        BIGINT      NOT NULL REFERENCES acad.quizzes(id) ON DELETE CASCADE,
    student_user_id BIGINT     NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    status         acad.quiz_attempt_status NOT NULL DEFAULT 'IN_PROGRESS',
    attempt_number INTEGER     NOT NULL DEFAULT 1,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at   TIMESTAMPTZ NULL,
    score          NUMERIC(7,2) NULL,
    max_score      NUMERIC(7,2) NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_quiz_attempts UNIQUE (quiz_id, student_user_id, attempt_number)
);

COMMENT ON TABLE acad.quiz_attempts IS 'Попытка студента пройти тест.';

CREATE INDEX idx_quiz_attempts_quiz    ON acad.quiz_attempts (quiz_id);
CREATE INDEX idx_quiz_attempts_student ON acad.quiz_attempts (student_user_id);

CREATE TRIGGER trg_quiz_attempts_updated_at BEFORE UPDATE ON acad.quiz_attempts
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.quiz_answers — ответы на вопросы в рамках попытки
-- =====================================================================
CREATE TABLE acad.quiz_answers (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attempt_id       BIGINT      NOT NULL REFERENCES acad.quiz_attempts(id) ON DELETE CASCADE,
    question_id      BIGINT      NOT NULL REFERENCES acad.quiz_questions(id) ON DELETE RESTRICT,
    answer           JSONB       NOT NULL,                        -- выбранные варианты / текст
    is_correct       BOOLEAN     NULL,
    points_awarded   NUMERIC(6,2) NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_quiz_answers UNIQUE (attempt_id, question_id)
);

COMMENT ON TABLE acad.quiz_answers IS 'Ответ студента на конкретный вопрос теста.';

CREATE INDEX idx_quiz_answers_attempt  ON acad.quiz_answers (attempt_id);
CREATE INDEX idx_quiz_answers_question ON acad.quiz_answers (question_id);

CREATE TRIGGER trg_quiz_answers_updated_at BEFORE UPDATE ON acad.quiz_answers
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.conversations — диалоги/чаты
-- =====================================================================
CREATE TABLE acad.conversations (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id   UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    owner_user_id BIGINT    NULL REFERENCES iam.users(id) ON DELETE SET NULL,
    course_instance_id BIGINT NULL REFERENCES acad.course_instances(id) ON DELETE SET NULL, -- чат курса
    conv_type   acad.conversation_type NOT NULL DEFAULT 'DIRECT',
    status      acad.conversation_status NOT NULL DEFAULT 'ACTIVE',
    title       VARCHAR(255) NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  UUID        NULL,
    updated_by  UUID        NULL
);

COMMENT ON TABLE acad.conversations IS 'Диалог/чат (личный, групповой, по курсу, поддержка).';

CREATE INDEX idx_conversations_owner  ON acad.conversations (owner_user_id);
CREATE INDEX idx_conversations_course ON acad.conversations (course_instance_id);

CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON acad.conversations
    FOR EACH ROW EXECUTE FUNCTION ops.touch_updated_at();

-- =====================================================================
-- acad.conversation_participants — участники чата
-- =====================================================================
CREATE TABLE acad.conversation_participants (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id BIGINT      NOT NULL REFERENCES acad.conversations(id) ON DELETE CASCADE,
    user_id         BIGINT      NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_at    TIMESTAMPTZ NULL,
    is_muted        BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_conversation_participants UNIQUE (conversation_id, user_id)
);

COMMENT ON TABLE acad.conversation_participants IS 'Участник чата (с метками прочтения).';

CREATE INDEX idx_conversation_participants_user ON acad.conversation_participants (user_id);

-- =====================================================================
-- acad.messages — сообщения чата
-- =====================================================================
CREATE TABLE acad.messages (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    conversation_id BIGINT      NOT NULL REFERENCES acad.conversations(id) ON DELETE CASCADE,
    sender_user_id  BIGINT      NULL REFERENCES iam.users(id) ON DELETE SET NULL,
    msg_type        acad.message_type NOT NULL DEFAULT 'TEXT',
    body            TEXT        NULL,
    attachments     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    reply_to_message_id BIGINT  NULL REFERENCES acad.messages(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE acad.messages IS 'Сообщение в чате (append-only).';

CREATE INDEX idx_messages_conversation ON acad.messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender       ON acad.messages (sender_user_id);

-- =====================================================================
-- Отложенный FK (раздел 3.9):
-- FK academic_term в заявках на общежитие (acad создан после acc)
-- =====================================================================
ALTER TABLE acc.accommodation_applications
    ADD CONSTRAINT fk_accommodation_applications_term
    FOREIGN KEY (academic_term_id) REFERENCES acad.academic_terms(id) ON DELETE SET NULL;

COMMENT ON COLUMN acc.accommodation_applications.academic_term_id IS
    'Учебный период, на который подаётся заявка на заселение (FK к acad.academic_terms).';
