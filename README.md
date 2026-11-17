# Единый студенческий портал (Student Super-App)

Монорепозиторий безбумажного студенческого портала вуза Республики Казахстан: NestJS-бэкенд + Next.js-фронтенд + Docker-инфраструктура.

Полная проектная документация (архитектура, БД, интеграции, стек/безопасность, roadmap) — в каталоге [`/docs`](docs/).

## Структура

```
├── apps/
│   ├── api/                 # NestJS-бэкенд (Prisma, модули по bounded contexts)
│   │   ├── prisma/          # schema.prisma (сущности), seed
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── common/      # PrismaService, JWT/roles guards, filters
│   │       └── modules/     # iam, academic, accommodation, social-benefits,
│   │                        # documents, services, integration-hub, notification, health
│   └── web/                 # Next.js 15 (App Router) фронтенд
├── migrations/              # DDL-миграции (Flyway-нумерация V001__…)
├── infra/
│   └── keycloak/            # realm-export.json (realm student-portal)
├── docker-compose.yml
└── docs/                    # утверждённая документация
```

## Быстрый старт

```bash
# 1. Инфраструктура (PostgreSQL, Redis, MinIO, RabbitMQ, OpenSearch, Keycloak)
cp .env.example .env
docker compose up -d
#    → при первом старте postgres автоматически применяет raw-SQL DDL
#      из каталога migrations/ (V001..V012, схемы iam/doc/acc/social/acad/svc/notif/ops)

# 2. Зависимости и генерация Prisma-клиента
pnpm install
pnpm prisma:generate

# 3. Переменные окружения API (DATABASE_URL и т.п.)
cp apps/api/.env.example apps/api/.env

# 4. Запуск в dev-режиме
pnpm dev:api    # http://localhost:3000/api  (Swagger: http://localhost:3000/api/docs)
pnpm dev:web    # http://localhost:3001
```

> **Windows PowerShell 5.1:** не используйте `&&` между командами — там он не поддерживается
> (`The token '&&' is not a valid statement separator`). Выполняйте команды по одной строке
> или разделяйте их `;`. Если `pnpm` ещё не установлен: `corepack enable` (или `npm i -g pnpm`).

Сборка в продакшен:

```bash
pnpm build                    # api (nest build) + web (next build)
docker compose --profile app up --build   # приложения api/web в контейнерах
```

Keycloak: `http://localhost:8080` (admin/admin), realm `student-portal`.
MinIO console: `http://localhost:9001`. RabbitMQ mgmt: `http://localhost:15672`.

## Ключевые соглашения

- **БД:** PostgreSQL 16, 8 схем по модулям (`iam`, `doc`, `acc`, `social`, `acad`, `svc`, `notif`, `ops`). Prisma `schema.prisma` — источник истины сущностей (multiSchema).
- **ИИН/БИН** — `VARCHAR(12)` + CHECK `^[0-9]{12}$`, на прикладном уровне шифрование AES-256-GCM + HMAC-токен `iin_token`.
- **Аутентификация:** Keycloak (OIDC, JWT RS256). Guard `JwtAuthGuard` валидирует токен по JWKS; роли из `realm_access.roles`.
- **Внешние мутации** — асинхронно через outbox (`ops.outbox_events`) + RabbitMQ; идемпотентность по `Idempotency-Key`.
- **Документы:** бинарные файлы в MinIO, в БД — метаданные + SHA-256; подписи ЭЦП (CAdES/XAdES/PAdES) + hash-chain.
