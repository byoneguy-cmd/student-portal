# syntax=docker/dockerfile:1
# Единый студенческий портал — Web (Next.js)
# Контекст сборки — корень монорепозитория:
#   docker build -f apps/web/Dockerfile -t sp-web .

# ---------- 1. Установка зависимостей ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app

# Манифесты pnpm-воркспейса
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --no-frozen-lockfile

# ---------- 2. Сборка ----------
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @sp/web build

# ---------- 3. Продакшн ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs
WORKDIR /app/apps/web

EXPOSE 3000

CMD ["node_modules/.bin/next", "start", "-p", "3000"]
