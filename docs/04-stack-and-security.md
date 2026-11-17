# 04 — Технологический стек и безопасность
## Единый студенческий портал безбумажного вуза (Student Super-App)

| Поле | Значение |
|---|---|
| Статус | **DRAFT — на согласование** |
| Версия | 0.1 |
| Автор | agent-stack |
| Дата | 2026-11-17 |
| Связь с ADR | Строго соответствует `docs/00-adr.md` (ADR-001…ADR-010) |
| Назначение | Детальная спецификация стека, безопасности, управления ключами ЭЦП и соответствия законодательству РК |

> Все версии ниже указаны как «актуальные стабильные на дату проектирования (ноябрь 2026)» и подлежат закреплению в `package.json`/`docker-compose`/`helm values` с пиннингом по точным версиям (semver + `sha256` для образов) и плановым апгрейдом по release train. Никаких `latest`-тегов в production.

---

## 0. Принципы выбора стека

1. **Единый язык** — TypeScript на фронте, бэкенде и в мобильном приложении (при выборе React Native); общие типы (`zod`-схемы, DTO, доменные модели) выносятся в shared-пакеты монорепозитория.
2. **Open source / self-hosted** для данных и инфраструктуры (PostgreSQL, Redis, MinIO, OpenSearch, RabbitMQ/Kafka, Keycloak, Grafana-стек) — требование локализации данных на территории РК и отсутствия вендор-лока.
3. **Производственная зрелость** — только технологии с активным сообществом, LTS-релизами и механизмами HA/DR.
4. **Безопасность by default** — zero-trust, шифрование in-transit и at-rest, минимизация и маскирование ПДн, полный аудит-трейл.
5. **Эволюционность** — старт с модульного монолита (ADR-001), очередь RabbitMQ → Kafka (ADR-004), REST → gRPC для горячих внутренних вызовов (ADR-003).

---

## 1. Сводная таблица стека «компонент → технология → версия → назначение»

| # | Компонент / слой | Технология | Версия (мин.) | Назначение |
|---|---|---|---|---|
| 1 | Runtime бэкенда | Node.js LTS (Jod) | 22.x | Выполнение NestJS-сервисов |
| 2 | Язык | TypeScript | 5.8+ | Единый язык front/back/mobile |
| 3 | Backend-фреймворк | NestJS | 11.x | Модульный монолит, DI, декораторы |
| 4 | ORM | Prisma | 6.x | Доступ к PostgreSQL, миграции, типизация |
| 5 | Валидация DTO | class-validator + class-transformer | 0.14.x / 0.5.x | Валидация входящих данных на границе |
| 6 | Валидация схем | zod | 3.24+ | Общие схемы валидации front/back |
| 7 | API-документация | @nestjs/swagger (OpenAPI 3.1) | 11.x | Спецификация REST, генерация клиентов |
| 8 | gRPC | @nestjs/microservices + @grpc/grpc-js + buf | 1.10+ | Горячие внутренние вызовы |
| 9 | Тестирование | Jest + supertest + @nestjs/testing | 29.x | Unit / e2e / контрактные тесты |
| 10 | Frontend-фреймворк | Next.js (App Router) | 15.x | Web PWA, SSR/ISR, маршрутизация |
| 11 | Frontend-библиотека | React | 19.x | UI |
| 12 | Server state | TanStack Query | 5.x | Кэш API-данных, retry, invalidation |
| 13 | Client state | Zustand | 5.x | Локальное состояние UI |
| 14 | UI-кит | Mantine + Tailwind CSS | 7.x / 3.4+ | Дизайн-система вуза, доступность |
| 15 | Формы | react-hook-form + zod | 7.x | Формы и валидация |
| 16 | PWA / офлайн | @serwist/next + IndexedDB (idb) | 9.x | Офлайн-кэш расписания, installable PWA |
| 17 | i18n | next-intl | 3.x | kk / ru / en локализация |
| 18 | Mobile-фреймворк | React Native + Expo | 0.76+ / SDK 53 | iOS/Android приложение |
| 19 | Mobile-навигация | Expo Router (React Navigation) | 7.x | Навигация, deep links |
| 20 | Push-уведомления | FCM (Android) + APNs (iOS) | — | Push-рассылка расписания/событий |
| 21 | БД (OLTP, истина) | PostgreSQL | 16.x | Реляционная целостность ЭДО, JSONB |
| 22 | Пул соединений | PgBouncer (transaction mode) | 1.24 | Пул коннектов к БД |
| 23 | Бэкапы / PITR | pgBackRest + WAL-архив в MinIO | 2.54 | Полные/инкрементальные бэкапы, PITR |
| 24 | Кэш / сессии / rate-limit | Redis (Cluster/Sentinel) | 7.4 | Кэш, сессии, лимиты, блокировки |
| 25 | Очередь сообщений | RabbitMQ (→ Kafka) | 3.13 → 3.9 | Асинхронные интеграции, DLQ |
| 26 | Хранилище файлов | MinIO (S3) | RELEASE.2024-12 | Файлы, скан-образы, подписанные PDF |
| 27 | Полнотекстовый поиск | OpenSearch | 2.18 | Поиск по документам и событиям |
| 28 | IAM | Keycloak (Quarkus) | 26.x | OIDC/OAuth2, SSO, федерация, роли |
| 29 | Трассировка/метрики | OpenTelemetry Collector | 0.118 | Сбор OTLP (traces/metrics/logs) |
| 30 | Метрики | Prometheus + Alertmanager | 3.x / 0.28 | Хранение метрик, алертинг |
| 31 | Визуализация | Grafana | 11.x | Дашборды |
| 32 | Логи | Loki | 3.x | Агрегация и поиск логов |
| 33 | Трейсы | Tempo | 2.x | Распределённая трассировка |
| 34 | CI/CD | GitHub Actions / GitLab CI | — | Сборка, тесты, сканы, публикация образов |
| 35 | GitOps | ArgoCD | 2.14 | Декларативный деплой в K8s |
| 36 | IaC | Terraform + Helm | 1.10 / 3.17 | Инфраструктура и релизы |
| 37 | Секреты | HashiCorp Vault + External Secrets Operator | 1.18 | Управление секретами, PKI, Transit |
| 38 | Оркестрация | Kubernetes | 1.31 | Запуск и масштабирование |
| 39 | Контейнерный рантайм | containerd (+ Docker в CI) | 2.x | Runtime подов |
| 40 | Service mesh (опц.) | Linkerd / Istio (mTLS) | 2.16 | mTLS, retry, канареечные релизы |
| 41 | WAF / периметр | nginx-ingress + ModSecurity / OWASP CRS | 4.x | Защита периметра, WAF-правила |

---

## 2. Технологический стек по слоям

### 2.1 Frontend (Web PWA)

**Решение (ADR-009):** `React 19 + TypeScript 5.8 + Next.js 15 (App Router)`, PWA как резервный канал и полноценный веб-клиент.

| Аспект | Выбор | Обоснование |
|---|---|---|
| Фреймворк | Next.js 15 (App Router, RSC) | SSR/ISR для SEO-нечувствительного ЛК не критичен, но даёт быстрый FCP, маршрутизацию, код-сплиттинг и единый Node-рантайм |
| State (server) | TanStack Query 5 | Кэш расписания/оценок, retry, invalidation, offline-режим, дедупликация запросов |
| State (client) | Zustand 5 | Лёгкое локальное состояние (фильтры, UI-флаги), без boilerplate Redux |
| UI-кит | Mantine 7 + Tailwind CSS 3.4 | Дизайн-система вуза, a11y, тёмная тема; Tailwind — утилитарная верстка |
| Формы | react-hook-form 7 + zod 3.24 | Производительность, единые схемы валидации с бэкендом |
| Валидация | zod (shared) | Одна схема — на клиенте (UX) и на сервере (безопасность) |
| HTTP-клиент | openapi-fetch / openapi-typescript | Генерация типизированного клиента из OpenAPI 3.1 |
| PWA | @serwist/next + `manifest.json` | Offline-кэш расписания (static + API) через Workbox runtime caching |
| Офлайн-кэш расписания | IndexedDB (`idb`) + TanStack Query persister | Расписание на N дней доступно без сети |
| i18n | next-intl (kk/ru/en) | Казахский/русский интерфейс (требование вуза) |
| Аутентификация | OIDC Authorization Code + PKCE → Keycloak (`oidc-client-ts`) | Безопасный флоу для SPA |

**Пример конфигурации кэша расписания (TanStack Query + persister):**

```ts
// apps/web/lib/query.ts
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { get, set, del } from 'idb-keyval';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // 1 мин — данные актуальны
      gcTime: 1000 * 60 * 60 * 24, // 24 ч кэш в IndexedDB
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Расписание — жёсткий offline-кэш
export const scheduleQuery = (groupId: string, week: number) => ({
  queryKey: ['schedule', groupId, week],
  queryFn: () => api.schedule.get(groupId, week),
  staleTime: 5 * 60_000,   // 5 мин
  gcTime: 7 * 24 * 3600_000, // 7 дней офлайн
  networkMode: 'offlineFirst',
});
```

**Пример манифеста PWA и SW-кэширования:**

```ts
// next.config.ts (фрагмент)
import withSerwist from '@serwist/next';
export default withSerwist({
  serwist: {
    swSrc: 'app/sw.ts',
    swDest: 'public/sw.js',
    runtimeCaching: [
      { urlPattern: /\/api\/schedule/, handler: 'NetworkFirst', options: { cacheName: 'schedule' } },
      { urlPattern: /\/api\//, handler: 'NetworkFirst', options: { cacheName: 'api' } },
      { urlPattern: /\.(?:png|svg|woff2)$/, handler: 'CacheFirst', options: { cacheName: 'assets' } },
    ],
  },
});
```

---

### 2.2 Mobile (React Native vs Flutter)

**Рекомендация: React Native + Expo (SDK 53, RN 0.76+)** — основной путь. Обоснование:

| Критерий | React Native (Expo) | Flutter |
|---|---|---|
| Единый язык со стеком | ✅ TypeScript, общий код (zod, DTO, API-клиент) | ❌ Dart — отдельная кодовая база |
| Команда | ✅ Та же команда (TS) | ⚠️ Нужны Dart-разработчики |
| Зрелость экосистемы | ✅ Зрелая, eGov-совместимые нативные модули | ✅ Зрелая, но иная |
| Push (FCM/APNs) | ✅ `expo-notifications` | ✅ `firebase_messaging` |
| Offline/кэш | ✅ TanStack Query + MMKV/SQLite | ✅ sqflite/hive |
| Производительность анимаций | ⚠️ Hermes + Reanimated (достаточно) | ✅ Высокая |
| Интеграция NCALayer/eGov | ✅ Нативные SDK через Expo Modules | ⚠️ Через platform channels |

**Выбор: React Native (Expo)** — максимум переиспользования кода, одна команда, быстрый MVP. **Flutter выбирается** только если: (а) требуется тяжёлая кастомная анимация/дизайн-графика, (б) команда уже сильна в Dart, (в) нужна максимально единая iOS/Android с идентичным рендером. PWA остаётся резервным каналом доступа (ADR-009).

**Состав мобильного стека:**

| Аспект | Выбор |
|---|---|
| Навигация | Expo Router (на базе React Navigation 7), deep links `portal://…` |
| State | TanStack Query 5 + Zustand 5 |
| Локальное хранилище | MMKV (быстрые kv) + expo-sqlite (офлайн-расписание) |
| Push | `expo-notifications` → FCM (Android) / APNs (iOS); обработка типов push: `schedule.changed`, `document.signed`, `dorm.status`, `payment.due` |
| OIDC | `expo-auth-session` (Authorization Code + PKCE), открытие Keycloak |
| ЭЦП | NCALayer Mobile SDK / eGov Mobile QR-deep-link |
| Безопасность | expo-secure-store (хранение refresh-токена в Keychain/Keystore), SSL pinning (expo-build-properties), запрет скриншотов на экранах с ПДн |

**Пример конфигурации push (app.json, фрагмент):**

```json
{
  "expo": {
    "name": "Student Portal",
    "plugins": [
      ["expo-notifications", { "icon": "./assets/notif-icon.png", "color": "#1f6feb" }],
      ["expo-secure-store", { "faceIDPermission": "Доступ к ключам приложения" }],
      ["expo-build-properties", { "android": { "usesCleartextTraffic": false }, "ios": { "deploymentTarget": "15.1" } }]
    ],
    "android": { "package": "kz.university.portal" },
    "ios": { "bundleIdentifier": "kz.university.portal" }
  }
}
```

---

### 2.3 Backend (NestJS)

**Решение (ADR-002):** NestJS 11 (TypeScript), модульный монолит со строгими границами модулей (ADR-001), интеграционные коннекторы — лёгкие адаптеры.

**Структура модулей (bounded contexts по ADR-003):**

```
apps/api/src/
  app.module.ts
  modules/
    iam/                 # IAM & Profile
    signature/           # Document & Signature (ЭЦП/ЭДО)
    accommodation/       # Accommodation
    social/              # Social Benefits
    academic/            # Academic (LMS)
    services/            # University Services
    integration-hub/     # Integration Hub (адаптеры per-система)
    notification/        # Notification
    audit/               # Ops / Audit
  shared/
    domain/              # доменные типы, value objects
    security/            # guards, декораторы @CurrentUser, @RequirePermission
    observability/       # OTel-инструментация, корреляционные ID
    validation/          # общие zod/class-validator схемы
```

**Правила зависимостей (enforce через ESLint `@nx/enforce-module-boundaries`):**
- модули не импортируют внутренности друг друга, только публичные фасады (`*-service.interface.ts`);
- `shared/` не зависит от модулей;
- интеграционные адаптеры живут только в `integration-hub`, реализуя контрактный интерфейс `IIntegrationAdapter`.

**Выбор ORM: TypeORM vs Prisma — решение: Prisma 6.**

| Критерий | Prisma 6 | TypeORM 0.3 |
|---|---|---|
| Типобезопасность | ✅ Полностью типизированный клиент | ⚠️ Средняя |
| Миграции | ✅ Декларативные `prisma migrate` | ✅ Программные |
| Транзакции | ✅ Interactive transactions | ✅ QueryRunner |
| JSONB | ✅ `Json` (Postgres) | ✅ `jsonb` |
| Сложные SQL | ⚠️ через `$queryRaw` | ✅ QueryBuilder |
| Скорость MVP | ✅ Высокая | Средняя |

**Выбор:** Prisma 6 — высокая скорость разработки и типобезопасность; для сложных аналитических запросов используется `$queryRaw` и материализованные представления (через миграции), для пакетного подписания — interactive transactions. **TypeORM** выбирается, если команда требует продвинутый QueryBuilder и нативные Postgres-фичи как основной путь.

**Контракт данных и валидация:**

- Входящие данные валидируются на границе `ValidationPipe` (`class-validator`/`class-transformer`), плюс `zod` для shared-схем (одинаковая схема на фронте и бэке).
- DTO: `CreateApplicationDto`, `SignPackageDto`, `ScheduleQueryDto` и т.д.
- `whitelist: true, forbidNonWhitelisted: true, transform: true` — запрет лишних полей.

```ts
// main.ts (фрагмент)
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
}));
```

**OpenAPI/Swagger (OpenAPI 3.1):**

```ts
// main.ts (фрагмент)
const cfg = new DocumentBuilder()
  .setTitle('Student Portal API')
  .setVersion('1.0')
  .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
  .build();
SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, cfg));
// генерация клиента: openapi-typescript → типизированный клиент для web/mobile
```

**gRPC-опция (для горячих внутренних вызовов, ADR-003):** `@nestjs/microservices` gRPC-транспорт + `@grpc/grpc-js` + `buf` для protobuf. Применяется для вызовов `signature.packageSign` и `academic.getTranscript`, где нужна низкая латентность и строгая схема.

```proto
// proto/signature/v1/signature.proto (фрагмент)
syntax = "proto3";
package signature.v1;
service SignatureService {
  rpc SignPackage(SignPackageRequest) returns (SignPackageResponse);
}
message SignPackageRequest {
  string document_id = 1;
  string signer_iin = 2; // маскируется в логах
}
```

**Тестирование (Jest 29):**

| Уровень | Инструмент | Покрытие |
|---|---|---|
| Unit | Jest + `@nestjs/testing` | сервисы, guards, утилиты ЭЦП |
| e2e | Jest + `supertest` + Testcontainers (PostgreSQL/Redis/MinIO) | сквозные сценарии подписания |
| Контрактные | Pact / OpenAPI-diff | контракты с BFF и внешними системами |
| Нагрузочные | k6 | пики заселения/сессии |

---

### 2.4 База данных (PostgreSQL 16)

**Решение (ADR-004):** PostgreSQL 16 — единственный источник истины (OLTP), JSONB для гибких справочников.

**Расширения:**

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;        -- gen_random_uuid(), хэши
CREATE EXTENSION IF NOT EXISTS pg_trgm;          -- нечёткий поиск по ФИО/названиям
CREATE EXTENSION IF NOT EXISTS btree_gin;        -- GIN по текстовым полям
CREATE EXTENSION IF NOT EXISTS citext;           -- регистронезависимые email/логины
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- мониторинг запросов
-- опционально: postgis (карты кампуса), pg_partman (партиционирование аудита)
```

**Ключевые настройки и пул соединений (PgBouncer 1.24):**

- PgBouncer в режиме **transaction** — совместимость с Prisma (без `prepared statements` на уровне сессии, либо `pgbouncer=true` в datasource URL).
- Размер пула: `default_pool_size = 25`, `max_client_conn = 5000`, `reserve_pool_size = 5`.

```ini
# pgbouncer.ini (фрагмент)
[databases]
portal = host=pg-primary port=5432 dbname=portal
[pgbouncer]
pool_mode = transaction
listen_port = 6432
default_pool_size = 25
max_client_conn = 5000
server_tls_sslmode = verify-full
```

```
# Prisma datasource (с пулом)
url = "postgresql://app:****@pgbouncer:6432/portal?pgbouncer=true&connection_limit=20"
```

**Бэкапы и PITR (pgBackRest 2.54):**

- Полный бэкап — еженедельно, дифференциальный — ежедневно, инкрементальный — каждые 4 часа.
- WAL-архивирование непрерывно в MinIO (`repo1-s3`), `archive_timeout = 60s` → **RPO ≈ 1–5 мин**.
- `restore_time` для PITR; регулярные тестовые восстановления (DR-drill).

```conf
# pgbackrest.conf (фрагмент)
[global]
repo1-type=s3
repo1-s3-bucket=portal-pg-backups
repo1-s3-region=kz-1
repo1-retention-full=5
repo1-retention-diff=4
repo1-path=/pgbackrest
[main]
pg1-path=/var/lib/postgresql/16/main
pg1-host=pg-primary
```

**Детали схемы, ERD, DDL, индексы, партиционирование аудита** — в `docs/02-database.md` (agent-db). Здесь фиксируются только технологические решения.

---

### 2.5 Кэш (Redis 7.4)

**Решение (ADR-004):** Redis — кэш, сессии, rate limiting, краткоживущие состояния подписания.

| Сценарий | Структура | TTL | Ключ |
|---|---|---|---|
| Кэш расписания/справочников | string (JSON) | 5–15 мин | `cache:schedule:{groupId}:{week}` |
| Кэш профиля (по IIN) | string (JSON, маскир.) | 10 мин | `cache:profile:{uin}` |
| Rate limiting | sorted set (sliding window) | окно 60 с | `rl:{ip|user}:{route}` |
| Сессии подписания | hash (challenge → статус) | 5 мин | `sign:{requestId}` |
| Идемпотентность | string (SET NX) | 24 ч | `idem:{idempotencyKey}` |
| Распределённые блокировки | string (SET NX PX) | 30 с | `lock:{resource}` |
| Кэш OCSP/CRL (валидация ЭЦП) | string | до `nextUpdate` | `ocsp:{serial}` |

**Топология:** Redis Cluster (6 нод, 3 мастера + 3 реплики) в production; Redis Sentinel (3 ноды) — допустимый минимум; `appendonly yes`, RDB-снапшоты, AOF `everysec`. Ключи ПДн хранятся **только зашифрованными или маскированными**, TTL обязателен (no-ПДн-in-cache-forever).

```yaml
# redis.conf (фрагмент)
appendonly yes
appendfsync everysec
maxmemory-policy allkeys-lru
maxmemory 4gb
```

---

### 2.6 Очередь сообщений (RabbitMQ → Kafka)

**Решение (ADR-004):** старт — RabbitMQ 3.13 (быстрый MVP, широкие возможности маршрутизации), миграция на Kafka 3.9 при росте объёма/потребителей и требовании event-sourcing/replay.

**Критерии перехода на Kafka:** > 5000 событий/сек устойчиво; потребность в реплее истории событий; много независимых консьюмеров; долгосрочное хранение событий (> 7 дней).

**Топики/очереди (по ADR-007, Outbox + idempotency-key):**

| Очередь/топик | Производитель | Потребитель | Назначение |
|---|---|---|---|
| `integration.outbox` | все модули | Integration Hub | Outbox-диспатчер во внешние системы |
| `integration.skud.*` | Accommodation | адаптер СКУД | Статусы заселения/пропусков |
| `integration.canteen.*` | Social | адаптер столовой | Синхронизация льготников |
| `academic.sync.*` | Academic | LMS-адаптер | Расписание/оценки |
| `notification.*` | все модули | Notification | E-mail/SMS/push |
| `audit.events` | все модули | Audit/SIEM | Аудит-трейл (без ПДн) |
| `signature.*` | Services | Signature | Задачи подписания |

**Гарантии доставки и обработка ошибок:**

- **At-least-once** + идемпотентные потребители (`idempotencyKey`/`messageId`); при Kafka — транзакции и exactly-once для критичных потоков (платежи).
- **Ретраи** с экспоненциальной паузой (1с → 2с → 4с → … → макс 5 мин, до N=10).
- **DLQ** (`*.dlq`) для окончательно недоставленных сообщений; операторский UI для переигрывания; алерт при росте DLQ.

```yaml
# RabbitMQ определение топологии (фрагмент, via amqplib/management)
queues:
  - name: integration.outbox
    arguments: { "x-dead-letter-exchange": "dlx", "x-message-ttl": 60000 }
  - name: integration.outbox.dlq
exchanges:
  - name: dlx
    type: direct
```

**Outbox-паттерн:** мутация в PostgreSQL и запись события в таблицу `outbox` — в одной транзакции; отдельный `outbox-dispatcher` публикует в очередь и помечает доставленным (идемпотентно). Это исключает «двойную запись» (dual-write problem).

---

### 2.7 Хранилище файлов (MinIO, S3)

**Решение (ADR-004, ADR-006):** MinIO — файлы, скан-образы, подписанные PDF.

**Бакеты и политики:**

| Бакет | Содержимое | Версионирование | Object Lock (WORM) | Шифрование |
|---|---|---|---|---|
| `portal-documents` | черновики/промежуточные документы | ✅ | ❌ | SSE-S3 |
| `portal-signed` | подписанные PDF/CAdES (справки, договоры) | ✅ | ✅ Compliance (юридически значимые) | SSE-S3 |
| `portal-scans` | скан-образы, приложения | ✅ | ❌ | SSE-S3 |
| `portal-attachments` | вложения, ДЗ, аватары | ✅ | ❌ | SSE-S3 |
| `portal-backups` | бэкапы БД/WAL, OpenSearch-снапшоты | ✅ | ❌ | SSE-S3 |

**Жизненный цикл (Lifecycle):**

```xml
<!-- lifecycle.xml (фрагмент) -->
<LifecycleConfiguration>
  <Rule>
    <ID>expire-drafts</ID>
    <Filter><Prefix>drafts/</Prefix></Filter>
    <Status>Enabled</Status>
    <Expiration><Days>90</Days></Expiration>
  </Rule>
  <Rule>
    <ID>signed-to-glacier</ID>
    <Filter><Prefix>signed/</Prefix></Filter>
    <Status>Enabled</Status>
    <Transition><Days>180</Days><StorageClass>GLACIER</StorageClass></Transition>
  </Rule>
</LifecycleConfiguration>
```

**WORM (Object Lock) для юридически значимых документов:** подписанные справки/договоры кладутся с `COMPLIANCE`-ретеншн (необратимая защита от удаления/перезаписи) на срок, требуемый законодательством об архивировании (например, 5 лет; уточняется юристами). `Governance`-режим — для операционных правок с аудитом.

```sh
# включение Object Lock на бакете
mc mb --with-lock portal-signed
mc retention set --compliance --duration 5y portal-signed/signed/2026/...  # удержание 5 лет
```

**Целостность и hash-chain (ADR-006):** каждый объект получает SHA-256; хэши документов связываются в цепочку (каждый новый хэш включает предыдущий) и сохраняются в PostgreSQL + выборочно в блокчейн-подобный журнал (при необходимости внешнего неопровержения). Репликация бакетов между зонами/сайтами (DR).

---

### 2.8 Поиск (OpenSearch 2.18)

**Решение (ADR-004):** OpenSearch — поиск по документам и событиям, не нагружает OLTP.

**Индексы:**

| Индекс | Содержимое | Анализатор | Примечание |
|---|---|---|---|
| `documents-*` | метаданные + extracted text документов | `russian`/`english` + `kuromoji`(опц.) | без полного ПДн |
| `audit-*` | аудит-события (маскированные) | `keyword`-доминантный | retention 90–400 дней |
| `events-*` | доменные события | `keyword` | retention 30 дней |
| `users-search` | поиск людей (ФИО, группа) | `russian`, `ngram` | маскированный ИИН |

**Маппинг (фрагмент):**

```json
{
  "mappings": {
    "properties": {
      "document_id": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "russian" },
      "content": { "type": "text", "analyzer": "russian", "index_options": "offsets" },
      "owner_iin": { "type": "keyword", "index": false },   // ИИН не индексируется
      "owner_pseudonym": { "type": "keyword" },              // токенизированный псевдоним
      "signed_at": { "type": "date" },
      "tags": { "type": "keyword" }
    }
  }
}
```

> ПДн в OpenSearch — **только маскированное/псевдонимизированное** (ИИН → HMAC-псевдоним), полный ИИН не индексируется и не хранится.

---

### 2.9 IAM (Keycloak 26, Quarkus)

**Решение (ADR-005):** Keycloak как единый OIDC/OAuth2-провайдер.

**Realm и клиенты:**

| Клиент | Тип | Флоу | Примечание |
|---|---|---|---|
| `portal-web` | public (SPA) | Authorization Code + PKCE | Web PWA |
| `portal-mobile` | public (native) | Authorization Code + PKCE | React Native |
| `portal-backend` | confidential (bearer-only) | Client Credentials | BFF/service-to-service |
| `integration-hub` | confidential | Client Credentials (mTLS) | интеграционные адаптеры |

**Федерация:** eGov Mobile / НУЦ как внешний IdP (OIDC/SAML-коннектор или custom Identity Provider SPI для QR-флоу); резервный вход сотрудников — логин/пароль (с обязательным MFA).

**Роли (RBAC):** `student`, `lecturer`, `deanery`, `finance`, `dorm_admin`, `canteen_admin`, `admin` + тонкие realm-роли для разрешений (`sign.document`, `issue.transcript`, `manage.dorm`).

**Realm-фрагмент (JSON):**

```json
{
  "realm": "student-portal",
  "enabled": true,
  "sslRequired": "external",
  "registrationAllowed": false,
  "accessTokenLifespan": 300,
  "ssoSessionIdleTimeout": 1800,
  "ssoSessionMaxLifespan": 36000,
  "clients": [
    {
      "clientId": "portal-web",
      "publicClient": true,
      "protocol": "openid-connect",
      "standardFlowEnabled": true,
      "implicitFlowEnabled": false,
      "directAccessGrantsEnabled": false,
      "pkce": { "codeChallengeMethod": "S256" },
      "redirectUris": ["https://portal.university.kz/*"],
      "webOrigins": ["https://portal.university.kz"]
    },
    {
      "clientId": "portal-backend",
      "publicClient": false,
      "bearerOnly": false,
      "protocol": "openid-connect",
      "serviceAccountsEnabled": true,
      "standardFlowEnabled": false,
      "clientAuthenticatorType": "client-secret"
    }
  ],
  "roles": {
    "realm": [
      { "name": "student" },
      { "name": "lecturer" },
      { "name": "deanery" },
      { "name": "finance" },
      { "name": "dorm_admin" },
      { "name": "admin" }
    ]
  },
  "identityProviders": [
    {
      "alias": "egov-mobile",
      "providerId": "oidc",
      "enabled": true,
      "authorizationUrl": "https://idp.egov.kz/oauth2/authorize",
      "tokenUrl": "https://idp.egov.kz/oauth2/token",
      "clientId": "portal-prod",
      "syncMode": "IMPORT"
    }
  ],
  "requiredActions": [
    { "alias": "CONFIGURE_TOTP", "enabled": true, "defaultAction": false }
  ]
}
```

**Интеграция с бэкендом:** валидация JWT на BFF через JWKS (`jwk-set-uri`), доступ по realm-ролям; Keycloak-события (login/logout/token) направляются в аудит-лог и SIEM.

---

### 2.10 Наблюдаемость (OpenTelemetry → Grafana-стек)

**Решение (ADR-010):** OpenTelemetry (OTLP) → Prometheus (метрики) + Loki (логи) + Tempo (трейсы) + Grafana (дашборды), Alertmanager (алерты).

**Инструментация:**
- Бэкенд: `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node` (HTTP, Postgres, Redis, AMQP, gRPC).
- Фронтенд/мобильное: `@opentelemetry/sdk-trace-web` (web-vitals, ошибки, RUM).
- Корреляция: `traceparent`/`trace_id` пробрасывается через BFF → сервисы → очереди (в заголовках сообщений).

**Конвейер:**

```
Приложение ──OTLP──► OpenTelemetry Collector ──► Prometheus (metrics)
                                    ├──────────► Loki (logs)
                                    └──────────► Tempo (traces)
```

```yaml
# opentelemetry-collector config (фрагмент)
receivers:
  otlp:
    protocols: { grpc: {}, http: {} }
exporters:
  otlphttp/metrics: { endpoint: "http://prometheus:9090/api/v1/otlp" }
  loki: { endpoint: "http://loki:3100/loki/api/v1/push" }
  otlp/traces: { endpoint: "http://tempo:4317" }
service:
  pipelines:
    traces:  { receivers: [otlp], exporters: [otlp/traces] }
    metrics: { receivers: [otlp], exporters: [otlphttp/metrics] }
    logs:    { receivers: [otlp], exporters: [loki] }
```

**SLO/алерты (Alertmanager):** латентность p95 API < 500 мс; error rate 5xx < 0.5%; доступность 99.9%; глубина очереди DLQ; задержка WAL-архива > 5 мин; свободное место БД/МиниО; refresh-token-атаки (аномальные частоты).

```yaml
# alerting rules (фрагмент)
groups:
  - name: portal
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_server_requests_total{status=~"5.."}[5m])) / sum(rate(http_server_requests_total[5m])) > 0.005
        for: 5m
        labels: { severity: critical }
```

---

### 2.11 CI/CD, GitOps, IaC, секреты

**Решение (ADR-010):** GitLab/GitHub Actions → сборка/тесты/сканы → registry → ArgoCD (GitOps) → Kubernetes; Terraform для инфраструктуры; HashiCorp Vault для секретов.

**Пайплайн (GitHub Actions, фрагмент):**

```yaml
name: ci
on: { push: { branches: [main] }, pull_request: {} }
jobs:
  build-test-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm test
      - run: pnpm dlx @nestjs/cli build
      # SAST / зависимости / контейнеры
      - run: pnpm dlx trivy fs --severity HIGH,CRITICAL .
      - run: pnpm dlx snyk test || true
      - run: docker build -t ghcr.io/university/portal-api:${{ github.sha }} .
      - run: trivy image --severity HIGH,CRITICAL ghcr.io/university/portal-api:${{ github.sha }}
```

**ArgoCD (GitOps):**

```yaml
# apps/portal-api/Chart.yaml → argocd Application (фрагмент)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata: { name: portal-api, namespace: argocd }
spec:
  project: portal
  source:
    repoURL: https://git.university.kz/infra/portal-gitops.git
    targetRevision: main
    path: apps/portal-api
    helm: { valueFiles: ["values-prod.yaml"] }
  destination: { server: "https://kubernetes.default.svc", namespace: portal-prod }
  syncPolicy:
    automated: { prune: true, selfHeal: true }
```

**Секреты (Vault 1.18):**
- KV-v2 — статические секреты (БД, MinIO, внешние API-ключи).
- PKI-engine — выдача внутренних TLS-сертификатов (mTLS между сервисами).
- Transit — encryption-as-a-service (шифрование полей ПДн до записи в БД).
- Доставка в K8s: **External Secrets Operator** (синхронизация Vault → `Secret`), либо Vault Agent Injector. Секреты **никогда** не хранятся в Git.

```yaml
# ExternalSecret (фрагмент)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata: { name: portal-db-creds, namespace: portal-prod }
spec:
  refreshInterval: 1h
  secretStoreRef: { kind: ClusterSecretStore, name: vault }
  target: { name: portal-db-creds }
  data:
    - secretKey: password
      remoteRef: { key: kv/portal/prod/db, property: password }
```

---

## 3. Безопасность

### 3.1 Модель угроз (кратко)

**Методика:** STRIDE (spoofing, tampering, repudiation, information disclosure, DoS, elevation of privilege) + LINDDUN (приватность).

**Кто атакует (акторы):**

| Актор | Мотивация | Возможности |
|---|---|---|
| Внешний злоумышленник (ботнет, скрипт-кидди) | кража ПДн, выкуп, фишинг | Интернет, автоматизированные атаки (OWASP) |
| Организованная группа / APT | массовая кража ПДн, доступ к гос. интеграциям | целевые атаки, социальная инженерия |
| Инсайдер (сотрудник/подрядчик) | превышение доступа, утечка ПДн | легитимный доступ к части систем |
| Компрометация цепочки поставок | внедрение в зависимости/образы | CI/CD, npm-пакеты |
| Злоумышленник в канале | перехват трафика | MITM, подделка ответов |

**Что защищаем (активы):** ИИН и другие ПДн (особый режим), ЭЦП и ключи вуза (HSM), подписанные юридически значимые документы, данные об успеваемости/льготах/финансах, интеграционные ключи к гос. системам, целостность аудит-трейла.

**Ключевые контрмеры (сводно):** zero-trust на периметре (ADR-008), TLS 1.3 + mTLS внутри кластера, HSM для ключей вуза, шифрование at-rest, маскирование ПДн в логах, MFA, RBAC/ABAC, NetworkPolicies, WAF, SIEM-мониторинг, полный аудит.

---

### 3.2 Управление ключами ЭЦП

**Два контура подписания (ADR-006):**

| Контур | Где ключ | Провайдер | Риск | Защита |
|---|---|---|---|---|
| **Пользовательская ЭЦП** (студент/сотрудник) | на устройстве пользователя | NCALayer (ПК) / eGov Mobile (QR) | утеря ключа владельцем | ключ не покидает устройство; сервер получает только подпись |
| **Серверная ЭЦП вуза** (справки, договоры) | на сервере | HSM / защищённое ПО-хранилище | кража ключа вуза | HSM (FIPS 140-2/3), PKCS#11, mTLS, аудит, разделение обязанностей |

**Пользовательские ключи (NCALayer / eGov Mobile):**
- Ключи генерируются и хранятся **на стороне пользователя** (NCALayer — локальный агент на ПК, токены Kaztoken/а-токены; eGov Mobile — защищённое хранилище устройства).
- Портал **никогда не получает закрытый ключ**; на сервер передаётся только подписанный результат (CAdES/XAdES/PAdES) и сертификат для проверки.
- Сессии подписания — короткоживущие challenge (Redis, TTL 5 мин), защита от replay (nonce/challenge).

**Серверная ЭЦП вуза — выбор: HSM vs программное хранилище.**

| Критерий | HSM (аппаратный) | Программное хранилище (PKCS#12/PKCS#11 soft) |
|---|---|---|
| Защита ключа | ✅ Аппаратная, ключ не извлекается | ⚠️ Файл с паролем на диске |
| FIPS 140-2/3 | ✅ Уровень 3 | ❌ |
| Соответствие требованиям НУЦ/регулятора | ✅ Рекомендуется | ⚠️ Приемлемо для старта |
| Стоимость | Выше (Thales Luna, Utimaco, CloudHSM) | Ниже |
| Производительность | Тысячи подписей/с | Ограничена CPU |

**Рекомендация:** с первого дня production — **аппаратный HSM** (Thales Luna Network HSM 7 / Utimaco SecurityServer, либо сертифицированный CloudHSM в облаке РК) для вузовской ЭЦП; на этапе dev/stage допускается программный PKCS#11-модуль с жёстким разделением прав и аудитом. Это снимает открытый риск ADR (п. 9.3).

**Хранение сертификатов и ключей:**

```yaml
# Схема хранения (логическая)
vault/kv/portal/signature/
  hsm: { provider: "pkcs11", slot: "2", key_label: "university-sign-2026", pin_ref: "hsm/pin" }
vault/transit/portal/
  field_encryption_key: "aes256-gcm96"        # шифрование полей ПДн
```

- Закрытые ключи — только в HSM (PKCS#11 `CKA_EXTRACTABLE=false`); PIN/SO-пароли — раздельное хранение (Vault + процедура двух лиц).
- Сертификаты вуза — в Vault и в хранилище для проверки; публичные сертификаты — OCSP/CRL.

**Ротация и отзыв:**

| Событие | Действие |
|---|---|
| Плановая ротация (ежегодно) | выпуск нового ключа в HSM, перевыпуск сертификата НУЦ, смена `key_label`, обновление хранилища доверия |
| Компрометация | немедленный отзыв в НУЦ (CRL/OCSP), смена ключа, расследование, ротация всех связанных секретов |
| Смена сотрудника | отзыв доступа к PIN/SO, перераспределение ролей |

- Проверка подписей — через OCSP/CRL НУЦ РК (`ocsp.pki.gov.kz`, `crl.pki.gov.kz`), цепочка доверия к корневому сертификату НУЦ; кэширование OCSP-ответов в Redis до `nextUpdate` (fallback на CRL при недоступности OCSP).

---

### 3.3 Криптография

| Аспект | Решение |
|---|---|
| In-transit | **TLS 1.3** (минимум 1.2), только сильные cipher suites; HSTS; mTLS для service-to-service |
| At-rest БД | **AES-256** (полнодисковое + полевое через Vault Transit / `pgcrypto`); TDE по возможности провайдера |
| At-rest файлы | MinIO SSE-S3 (AES-256-GCM) + WORM для юридических документов |
| Хэширование | SHA-256/SHA-384 для целостности; **Argon2id** для паролей сотрудников (не для ЭЦП); bcrypt fallback |
| Подписи (форматы) | **CAdES** (PKCS#7/CMS) для документов, **XAdES/XMLDSig** для гос. SOAP, **PAdES** для PDF |
| Алгоритмы ЭЦП | RSA-2048/4096 + SHA-256, EC P-256; совместимость с НУЦ РК — ГОСТ 34.10-2015 / СТ РК 34.10-2015 и RSA по типу выданного сертификата |
| HMAC | HMAC-SHA256 для API-key подписей интеграций (СКУД, столовая) |
| KDF | HKDF-SHA256 для вывода ключей шифрования полей |

> Точный набор алгоритмов ЭЦП определяется типом сертификата, выданным НУЦ РК (ГОСТ/РК или RSA); библиотеки подписания — `JavaPKCS11`/`python-pkcs11`/`@peculiar/x509` + нативные модули NCALayer, согласованные с НУЦ.

**Форматы подписей (ADR-006):**

| Формат | Применение | Стандарт |
|---|---|---|
| CAdES (CAdES-BES/T) | подписанные контейнеры документов, hash-chain | ETSI EN 319 122 |
| XAdES (XAdES-BES/T) | SOAP-запросы в ЕШЭП/НОБД (XMLDSig) | ETSI EN 319 132 |
| PAdES (PAdES-BES/LTV) | подписанные PDF (справки, договоры) с LTV (встраивание OCSP/CRL) | ETSI EN 319 142 |

---

### 3.4 Аутентификация и авторизация

**Аутентификация (ADR-005):**
- OIDC Authorization Code + PKCE (SPA/native), short-lived **JWT access-token (5 мин)** + **refresh-token** (ротация, одноразовый, в httpOnly/Secure cookie для web или SecureStore для mobile).
- **MFA** — TOTP (сотрудники, обязателен), WebAuthn (опционально), eGov Mobile QR / ЭЦП как сильный фактор.
- Защита от brute-force — rate limiting на `/token`, lockout, риск-скоринг.

```yaml
# BFF валидация JWT (фрагмент)
JWKS_URI: https://sso.university.kz/realms/student-portal/protocol/openid-connect/certs
TOKEN_AUDIENCE: portal-backend
ACCESS_TOKEN_TTL: 300
REFRESH_ROTATION: "on"        # refresh-токен обновляется при каждом использовании
```

**Авторизация:**
- **RBAC** — realm-роли Keycloak (`student`, `deanery`, …) + тонкие разрешения.
- **ABAC** — для чувствительных операций: доступ к документу только владельцу (ИИН), преподаватель видит только свою группу, деканат — свой факультет (политики на атрибутах: роль + ИИН + faculty/group).

```ts
// guard (фрагмент)
@RequirePermission('issue.transcript')       // RBAC
@RequireAttribute('faculty', 'OWNER')         // ABAC: только свой факультет
async getTranscript(@CurrentUser() u: UserCtx, @Param('id') id: string) { ... }
```

**Защита API:**
- Все ручки за JWT (кроме health/metadata); client-credentials + mTLS для service-to-service.
- Rate limiting per-user/per-IP (Redis sliding window), scopes, проверка `aud`, `iss`, `exp`, `sub`.
- Версионирование API (`/api/v1/…`), чёткие 401/403.

---

### 3.5 Защита приложений (OWASP Top 10)

| OWASP Top 10 (2021) | Контрмера |
|---|---|
| A01 Broken Access Control | RBAC/ABAC-гарды на каждой ручке, object-level authorization (ownership), тесты на IDOR |
| A02 Cryptographic Failures | TLS 1.3, AES-256, Argon2id, HSM, отключение слабых cipher |
| A03 Injection | ORM (Prisma) с параметризацией, `$queryRaw` только через параметры, запрет динамического SQL |
| A04 Insecure Design | threat modeling, secure-by-design, review архитектуры |
| A05 Security Misconfiguration | baseline-образы, disable debug, CSP/HSTS, минимальные привилегии |
| A06 Vulnerable Components | SCA (Trivy/Snyk/Dependabot), пиннинг версий, SBOM (CycloneDX) |
| A07 Identification Failures | MFA, rate limiting, lockout, ротация токенов |
| A08 Software/Data Integrity | подпись образов (Cosign), hash-chain документов, проверка зависимостей |
| A09 Logging Failures | централизованный аудит-лог (без ПДн), SIEM, алерты |
| A10 SSRF | allowlist внешних хостов в Integration Hub, egress-контроль, блокировка metadata-эндпоинтов облака |

**Валидация ввода:** все входные данные через `ValidationPipe` (class-validator) + zod-схемы; строгая типизация; limit размера body (например, 5 МБ), фильтрация загрузок (MIME + антивирус ClamAV), запрет HTML/скриптов в пользовательском контенте (sanitize).

**Rate limiting / боты:**

```ts
// throttler (фрагмент)
ThrottlerModule.forRoot([{
  ttl: 60_000, limit: 60,               // общий лимит
}])
// per-route: подписание, /token, платёж — жёстче
@Throttle({ default: { limit: 10, ttl: 60_000 } })
```

- CAPTCHA (hCaptcha/Turnstile) на регистрации/авторизации/подписании; device fingerprinting; IP-репутация.

**CSRF / CORS / заголовки:**
- CSRF: API принимает только `Authorization: Bearer` (не cookie) → CSRF не применим; для web-сессий — SameSite=Strict/Lax + double-submit.
- CORS: строгий allowlist origin, запрет `*` с credentials.

```ts
app.enableCors({
  origin: ['https://portal.university.kz', 'https://stage.university.kz'],
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
});
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'no-referrer' },
}));
```

---

### 3.6 Сетевая сегментация и Kubernetes security

**Сетевая сегментация:**

```
Internet → WAF (nginx-ingress + OWASP CRS) → DMZ (BFF, web) → app-zone (сервисы)
   → data-zone (PostgreSQL, Redis, MinIO, OpenSearch, Keycloak, RabbitMQ/Kafka)
   → int-zone (Integration Hub) → только наружу к гос. системам (allowlist egress)
```

- Базы/очереди/хранилища **не публикуются** наружу; доступ только из app-zone.
- Integration Hub — отдельная зона с ограниченным egress (только к согласованным гос. хостам).

**Kubernetes security:**

```yaml
# NetworkPolicy: данные доступны только из app-zone (фрагмент)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: pg-deny-all, namespace: portal-prod }
spec:
  podSelector: { matchLabels: { app: postgres } }
  policyTypes: [Ingress, Egress]
  ingress:
    - from:
        - namespaceSelector: { matchLabels: { zone: app } }
      ports: [{ protocol: TCP, port: 5432 }]
```

```yaml
# Pod Security (PSS restricted) — на уровне namespace
apiVersion: v1
kind: Namespace
metadata:
  name: portal-prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

| Контроль | Решение |
|---|---|
| PodSecurity | `restricted` (non-root, readOnlyRootFilesystem, drop ALL capabilities, seccomp) |
| Secrets | только через External Secrets (Vault); `encryption at rest` etcd (KMS); запрет literal secrets в git |
| RBAC | отдельные ServiceAccounts, минимальные роли, запрет default SA |
| Образы | подписанные (Cosign), non-root, distroless, сканы Trivy |
| Admission | OPA/Gatekeeper (запрет privileged, hostPath, unknown registries) |
| Runtime | Falco (детект аномалий), audit-log в SIEM |
| Firewall | Security Groups/NSG по зонам + WAF на периметре |

```yaml
# SecurityContext (фрагмент deployment)
securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  seccompProfile: { type: RuntimeDefault }
  capabilities: { drop: ["ALL"] }
  readOnlyRootFilesystem: true
```

---

### 3.7 Аудит и логирование (без ПДн), SIEM

**Принцип:** каждый юридически значимый и чувствительный шаг фиксируется; **ПДн в логи не попадает**.

**Маскирование ИИН (и др. ПДн):**
- Формат ИИН: 12 цифр. Маскирование на уровне библиотеки логирования (redact по паттернам и по полям).
- Политика: в логах ИИН заменяется на **HMAC-псевдоним** (`hmac_sha256(iin, per-env-secret)`) или маску `9201******45` (первые 4 + последние 2); e-mail/телефон — частично; полные значения — только в зашифрованных полях БД.

```ts
// pino/otel redaction (фрагмент)
const redactPaths = ['*.iin', '*.passport', '*.phone', '*.email', '*.address'];
const logger = pino({ redact: { paths: redactPaths, censor: '[REDACTED]' } });
// + структурная маска: IIN → HMAC-псевдоним для корреляции
```

**События аудита (таблица `audit_log` / очередь `audit.events`):**

| Событие | Поля | Хранение |
|---|---|---|
| `auth.login`, `auth.logout`, `auth.failed` | actor (псевдоним), IP, время, результат | 400 дней (OpenSearch) |
| `signature.sign`, `signature.verify` | docId, сертификат, OCSP-результат, hash | 5+ лет (WORM) |
| `document.issue`, `document.view` | docId, actor, hash-chain | 5+ лет (WORM) |
| `integration.call` | система, операция, idempotencyKey, статус | 90 дней |
| `admin.change`, `role.change` | actor, операция, diff | 400 дней |

**SIEM:** сбор логов и аудита в SIEM (Wazuh / Elastic Security / SIEM оператора), корреляционные правила, алерты на: аномальные логины, множественные отказы подписи, доступ к чувствительным документам вне рабочих часов, попытки обхода rate-limit, изменения привилегий.

---

## 4. Соответствие законодательству РК

### 4.1 ЗРК «О персональных данных и их защите» (21.05.2013, № 94-V ЗРК)

| Требование | Реализация в системе |
|---|---|
| **Правовое основание и согласие** | Согласие на обработку ПДн при первом входе (UX-флоу, ADR п.9.4); отдельное согласие на передачу в гос. системы; журнал согласий с версией текста |
| **Локализация хранения** | Базы данных и серверы с ПДн размещаются **на территории РК** (ст. 12); облако — казахстанский провайдер или on-prem |
| **Минимизация** | Сбор только необходимого минимума (ИИН, ФИО, дата рождения, контакты, льготные статусы); остальное — по требованию процесса |
| **Трансграничная передача** | Запрещена по умолчанию; допускается только в страны с адекватной защитой или с согласия субъекта — для сервисов вне РК (если используются) оформляется DPA и оценка |
| **Права субъекта** | Личный кабинет: просмотр, исправление, удаление/обезличивание, отзыв согласия, экспорт данных |
| **Защита** | Шифрование at-rest/in-transit, RBAC/ABAC, аудит, маскирование в логах |
| **Уведомление** | Регистрация/уведомление уполномоченного органа (реестр владельцев ПДн) и назначение ответственного за защиту ПДн |

**Меры при инциденте:** обязательное уведомление субъектов и уполномоченного органа при утечке (по законодательству), план реагирования (см. раздел 6).

### 4.2 ЗРК «Об информатизации» (24.11.2015, № 418-V ЗРК)

| Требование | Реализация |
|---|---|
| **Регистрация ИС** | Портал регистрируется/учитывается в реестре ИС (МЦРИАП); технический паспорт ИС |
| **Требования к ИС** | Соответствие требованиям информационной безопасности, классификация ИС (категория по уровню защищённости) |
| **Испытания** | Испытания ИС на соответствие требованиям ИБ (аттестация) перед вводом в промышленную эксплуатацию |
| **Единая архитектура e-gov** | Интеграция через ШЭП/ЕШЭП и Smart Data Ukimet по регламентам АО «НИТ» |
| **Гос. услуги/сервисы** | Предоставление электронных услуг в соответствии с регламентами e-gov |

### 4.3 ЗРК «Об электронном документе и электронной цифровой подписи» (07.01.2003, № 370-II ЗРК)

| Требование | Реализация |
|---|---|
| **Юридическая сила ЭД** | Электронный документ, подписанный ЭЦП, равнозначен бумажному; договоры/справки/заявления хранятся как ЭД с ЭЦП |
| **ЭЦП** | ЭЦП создаётся средствами, сертифицированными/зарегистрированными в НУЦ РК; проверка по сертификату регистрации |
| **Подтверждение** | Подпись проверяется через OCSP/CRL НУЦ и цепочку доверия; время подписания — доверенная метка времени (TSP/OCSP) |
| **Хранение ЭД** | Архив ЭД с hash-chain и WORM (неизменность и целостность), сроки — по законодательству об архивировании |

### 4.4 Регламенты НУЦ РК

| Аспект | Реализация |
|---|---|
| **Сертификаты** | Корневой сертификат НУЦ РК (ГОСТ и RSA), регистрационные свидетельства, ЭЦП вуза и пользователей |
| **Проверка статуса** | OCSP (`ocsp.pki.gov.kz`) с кэшированием; CRL (`crl.pki.gov.kz`) как fallback |
| **Стандарты СКЗИ** | СТ РК 1073-2007 (средства криптографической защиты), СТ РК 34.10-2015 / ГОСТ 34.10-2015 для ЭЦП (по типу сертификата) |
| **NCALayer** | Локальное подписание через NCALayer (ПК/моб.), совместимость по регламентам НУЦ |
| **Процедуры** | Ротация, отзыв сертификатов, разделение ключей по назначению (авторизация vs подписание) |

---

## 5. Среды, конфигурация, лимиты и квоты

### 5.1 Среды

| Среда | Назначение | Данные | Доступ | Масштаб |
|---|---|---|---|---|
| `dev` | разработка, интеграционные тесты | синтетические/обезличенные | разработчики | минимальный (single-node) |
| `stage` | предпрод, UAT, нагрузочные тесты | обезличенные копии prod | разработчики, QA, заказчик | ~50% prod |
| `prod` | промышленная эксплуатация | реальные ПДн | ограниченный (только через аудируемый доступ) | полный HA |

- **Разделение жёсткое** (ADR-008): отдельные кластеры/неймспейсы, отдельные Keycloak realm (`student-portal-dev/stage/prod`), отдельные Vault-пути (`kv/portal/dev/…`), отдельные ключи HSM (или слоты), отдельные DNS/домены.
- Prod-доступ — только через jump-host + MFA + audit; изменения — только через GitOps (нет ручного `kubectl apply`).

### 5.2 Управление конфигурацией

- **Иерархия:** `base` (общая) → `env` (dev/stage/prod) → `service` (per-component); значения в Vault + ConfigMap (не-секретные).
- Секреты — только Vault → External Secrets; не-секретные параметры — Helm values по средам.
- `12-factor`-подход: конфигурация через переменные окружения.

```yaml
# configmap (фрагмент, не-секретные настройки)
apiVersion: v1
kind: ConfigMap
metadata: { name: portal-api-config, namespace: portal-prod }
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  ACCESS_TOKEN_TTL: "300"
  REDIS_URL: "redis-cluster:6379"
  OPENAPI_PATH: "/api/docs"
```

### 5.3 Лимиты и квоты (ResourceQuota / LimitRange / HPA)

```yaml
# ResourceQuota (фрагмент)
apiVersion: v1
kind: ResourceQuota
metadata: { name: portal-quota, namespace: portal-prod }
spec:
  hard:
    requests.cpu: "32"
    requests.memory: "64Gi"
    limits.cpu: "64"
    limits.memory: "128Gi"
    persistentvolumeclaims: "40"
    secrets: "200"
```

```yaml
# LimitRange (фрагмент)
apiVersion: v1
kind: LimitRange
metadata: { name: portal-limits, namespace: portal-prod }
spec:
  limits:
    - default: { cpu: "500m", memory: "512Mi" }
      defaultRequest: { cpu: "100m", memory: "128Mi" }
      max: { cpu: "4", memory: "8Gi" }
      type: Container
```

```yaml
# HPA (фрагмент) — масштабирование под пики заселения/сессии
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: portal-api-hpa, namespace: portal-prod }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: portal-api }
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
    - type: Resource
      resource: { name: memory, target: { type: Utilization, averageUtilization: 75 } }
```

**Лимиты приложений:** размер загрузки ≤ 25 МБ/файл (сканы — до 50 МБ через chunked multipart), rate limit по пользователю/маршруту, квота диска на студента (документы/вложения).

---

## 6. Disaster Recovery и бэкапы (RPO/RTO)

### 6.1 Целевые показатели

| Метрика | Целевое значение | Обоснование |
|---|---|---|
| **RPO (БД)** | **≤ 5 минут** | непрерывное WAL-архивирование (`archive_timeout=60s`) + инкрементальные бэкапы |
| **RPO (файлы)** | **≤ 15 минут** | репликация бакетов MinIO между зонами/сайтами |
| **RTO (критичные сервисы)** | **≤ 1 час** | автоматический failover/восстановление IAM, Academic, Signature |
| **RTO (полное восстановление)** | **≤ 4 часа** | полный DR-переключатель на резервный сайт |
| Доступность (SLO) | 99.9% | ADR п.1 |

### 6.2 Стратегия бэкапов

| Объект | Метод | Частота | Хранение |
|---|---|---|---|
| PostgreSQL | pgBackRest full + diff + WAL | full еженедельно, diff ежедневно, WAL непрерывно | 35 дней + PITR |
| MinIO | репликация бакетов + версионирование | непрерывно (async) | по lifecycle |
| Keycloak | realm export + бэкап БД | ежедневно + при изменениях | 35 дней |
| Vault | raft snapshot | ежедневно | 90 дней (шифровано) |
| OpenSearch | snapshot repository в MinIO | ежедневно | 30–90 дней |
| K8s/манифесты | Git (источник истины) + etcd snapshot | непрерывно/ежедневно | Git + 90 дней |

### 6.3 DR-архитектура

- **Два сайта/зоны** (active-passive или active-active для критичных): репликация БД (streaming + WAL), MinIO site-replication, Redis replica, DNS failover.
- **DR-drill** — ежеквартальные учения восстановления с замером RTO/RPO (обязательный критерий приёмки).
- **План реагирования** на инциденты безопасности: изоляция, уведомление (в т.ч. субъектов ПДн и уполномоченного органа по ЗРК), форензика, восстановление из чистого снапшота.

```sh
# пример восстановления PITR (фрагмент)
pgbackrest --stanza=main restore --type=time --target="2026-11-17 12:00:00+05" --delta
```

---

## 7. Открытые вопросы

1. **Выбор HSM** — модель/вендор и сертификация в РК (уточняется на Discovery, ADR п.9.3).
2. **Облако vs on-prem в РК** — влияет на PITR/DR и SLA провайдера.
3. **Точный тип алгоритма ЭЦП НУЦ** (ГОСТ/RSA) — по договору с НУЦ; влияет на библиотеки подписания.
4. **Сроки ретеншн юридически значимых ЭД** — уточнить у юристов (архивное законодательство).
5. **SIEM-платформа** — Wazuh (self-hosted) vs коммерческий SIEM оператора.
6. **Service mesh (Linkerd/Istio)** — включать с первого дня или на этапе микросервисов.
7. **Service Mesh mTLS vs ручной PKI** — подтвердить объём внутреннего mTLS.
