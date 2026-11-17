-- =====================================================================
-- V002 — ENUM-типы
-- Источник: docs/02-database.md, раздел 3.1
-- =====================================================================

-- =====================================================================
-- IAM
-- =====================================================================
CREATE TYPE iam.user_status AS ENUM ('PENDING','ACTIVE','SUSPENDED','GRADUATED','EXPELLED','ARCHIVED');
CREATE TYPE iam.identity_provider AS ENUM ('EGOV_MOBILE','NCALAYER','PASSWORD','KEYCLOAK_SSO','EXTERNAL_LMS');
CREATE TYPE iam.identity_status AS ENUM ('LINKED','UNLINKED','SUSPENDED');
CREATE TYPE iam.role_type AS ENUM ('STUDENT','LECTURER','DEANERY','FINANCE','DORM_ADMIN','CANTEEN_ADMIN','ADMIN');
CREATE TYPE iam.import_source AS ENUM ('SMART_DATA_UKIMET','NOBD','EGOV_MOBILE','GBD_FL','GBD_RN','MTSZN','MZ','MANUAL');
CREATE TYPE iam.import_status AS ENUM ('PENDING','IN_PROGRESS','COMPLETED','FAILED','PARTIAL');
CREATE TYPE iam.consent_status AS ENUM ('GRANTED','REVOKED','EXPIRED');
CREATE TYPE iam.consent_scope AS ENUM ('PROFILE','DOCUMENTS','ACCOMMODATION','SOCIAL_BENEFITS','ACADEMIC','MEDICAL','FINANCIAL','ALL');

-- =====================================================================
-- Document & Signature
-- =====================================================================
CREATE TYPE doc.document_status AS ENUM ('DRAFT','PENDING_SIGNATURE','SIGNED','REJECTED','ARCHIVED','EXPIRED');
CREATE TYPE doc.document_type AS ENUM (
    'APPLICATION','STATEMENT','CONTRACT','LEASE_CONTRACT','HANDOVER_ACT',
    'CERTIFICATE','TRANSCRIPT','ORDER','CERTIFICATE_OF_STUDY','OTHER'
);
CREATE TYPE doc.package_status AS ENUM ('DRAFT','READY','SIGNING','PARTIALLY_SIGNED','SIGNED','ARCHIVED');
CREATE TYPE doc.signature_status AS ENUM ('PENDING','IN_PROGRESS','SIGNED','REJECTED','FAILED','REVOKED');
CREATE TYPE doc.signature_format AS ENUM ('CADES','XADES','PADES');
CREATE TYPE doc.signer_type AS ENUM ('USER','UNIVERSITY','SYSTEM');
CREATE TYPE doc.hash_algorithm AS ENUM ('SHA-256','SHA-512');

-- =====================================================================
-- Accommodation
-- =====================================================================
CREATE TYPE acc.dormitory_status AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE acc.room_status AS ENUM ('FREE','OCCUPIED','PARTIALLY_OCCUPIED','RESERVED','MAINTENANCE','BLOCKED');
CREATE TYPE acc.gender_policy AS ENUM ('MALE','FEMALE','MIXED','ANY');
CREATE TYPE acc.application_status AS ENUM ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','WAITLIST','CANCELLED');
CREATE TYPE acc.allocation_status AS ENUM ('PENDING_MOVE_IN','ACTIVE','TERMINATED','EVICTED','ARCHIVED');

-- =====================================================================
-- Social Benefits
-- =====================================================================
CREATE TYPE social.eligibility_status AS ENUM ('PENDING','ACTIVE','EXPIRED','REVOKED');
CREATE TYPE social.meal_application_status AS ENUM ('DRAFT','SUBMITTED','APPROVED','REJECTED','ACTIVE','SUSPENDED','EXPIRED','CANCELLED');
CREATE TYPE social.meal_period AS ENUM ('BREAKFAST','LUNCH','DINNER','ALL_DAY');

-- =====================================================================
-- Academic
-- =====================================================================
CREATE TYPE acad.term_type AS ENUM ('SEMESTER','TRIMESTER','SUMMER','QUARTER');
CREATE TYPE acad.enrollment_status AS ENUM ('PENDING','ACTIVE','COMPLETED','DROPPED','WITHDRAWN');
CREATE TYPE acad.schedule_entry_type AS ENUM ('LECTURE','PRACTICE','LAB','SEMINAR','EXAM','CONSULTATION');
CREATE TYPE acad.weekday AS ENUM ('MON','TUE','WED','THU','FRI','SAT','SUN');
CREATE TYPE acad.grade_status AS ENUM ('PENDING','SUBMITTED','APPROVED','APPEALED','CHANGED');
CREATE TYPE acad.appeal_status AS ENUM ('SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','RESOLVED');
CREATE TYPE acad.elective_status AS ENUM ('OPEN','CLOSED','FULL','CANCELLED');
CREATE TYPE acad.submission_status AS ENUM ('NOT_SUBMITTED','SUBMITTED','LATE','GRADED','RETURNED','RESUBMITTED');
CREATE TYPE acad.quiz_status AS ENUM ('DRAFT','PUBLISHED','CLOSED');
CREATE TYPE acad.quiz_attempt_status AS ENUM ('IN_PROGRESS','SUBMITTED','GRADED','TIMED_OUT');
CREATE TYPE acad.conversation_type AS ENUM ('DIRECT','GROUP','COURSE','SUPPORT');
CREATE TYPE acad.conversation_status AS ENUM ('ACTIVE','CLOSED','ARCHIVED');
CREATE TYPE acad.message_type AS ENUM ('TEXT','FILE','SYSTEM');

-- =====================================================================
-- University Services
-- =====================================================================
CREATE TYPE svc.certificate_status AS ENUM ('REQUESTED','ISSUED','REJECTED','REVOKED','EXPIRED');
CREATE TYPE svc.certificate_type AS ENUM ('STUDY_CONFIRMATION','TRANSCRIPT','GRADE_SHEET','ENROLLMENT','SCHOLARSHIP','OTHER');
CREATE TYPE svc.invoice_status AS ENUM ('ISSUED','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED','VOID');
CREATE TYPE svc.payment_status AS ENUM ('CREATED','PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED','EXPIRED');
CREATE TYPE svc.payment_method AS ENUM ('CARD','EGOV_PAY','HALYK','BANK_TRANSFER','CASH','OTHER');

-- =====================================================================
-- Notification & Ops
-- =====================================================================
CREATE TYPE notif.notification_channel AS ENUM ('EMAIL','SMS','PUSH','IN_APP');
CREATE TYPE notif.notification_status AS ENUM ('PENDING','SENT','DELIVERED','READ','FAILED','CANCELLED');
CREATE TYPE notif.notification_priority AS ENUM ('LOW','NORMAL','HIGH','URGENT');
CREATE TYPE ops.outbox_status AS ENUM ('PENDING','PUBLISHED','FAILED','DLQ');
