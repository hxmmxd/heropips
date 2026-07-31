# syntax=docker/dockerfile:1
# Build context = repo root (see infra/compose/docker-compose.yml).

# --- deps: install workspace deps for @heropips/web -------------------------
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
# All workspace manifests must be present for --frozen-lockfile importer checks.
COPY apps/web/package.json apps/web/
COPY apps/services/growth/package.json apps/services/growth/
COPY apps/services/billing/package.json apps/services/billing/
COPY packages/ui/package.json packages/ui/
COPY packages/contracts/package.json packages/contracts/
COPY infra/mocks/nowpayments/package.json infra/mocks/nowpayments/
RUN pnpm install --frozen-lockfile --filter @heropips/web...

# --- build: next build (standalone output) -----------------------------------
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /repo ./
COPY tsconfig.base.json ./
COPY packages/ui ./packages/ui
COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web
RUN pnpm --filter @heropips/web build

# --- run: minimal standalone runtime -----------------------------------------
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Monorepo standalone tree mirrors the repo layout: server.js sits at apps/web/server.js.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
