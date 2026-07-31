# syntax=docker/dockerfile:1
# Build context = repo root (see infra/compose/docker-compose.yml).

# --- deps: install workspace deps for @heropips/billing-svc ------------------
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
RUN pnpm install --frozen-lockfile --filter @heropips/billing-svc...

# --- run: tsx runtime (no build step for this phase) --------------------------
FROM node:22-alpine AS run
WORKDIR /repo
ENV NODE_ENV=production PORT=4002
# Keep the /repo layout so pnpm's node_modules symlinks stay valid.
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/services/billing/node_modules ./apps/services/billing/node_modules
COPY --from=deps /repo/packages/contracts/node_modules ./packages/contracts/node_modules
COPY tsconfig.base.json package.json ./
COPY packages/contracts ./packages/contracts
COPY apps/services/billing ./apps/services/billing
WORKDIR /repo/apps/services/billing
USER node
EXPOSE 4002
CMD ["node_modules/.bin/tsx", "src/main.ts"]
