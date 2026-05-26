FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Install deps ──
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/types/package.json packages/types/
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# ── Copy source & build ──
COPY packages/types/ packages/types/
COPY packages/database/ packages/database/
COPY apps/api/ apps/api/
COPY tsconfig.base.json ./

RUN pnpm --filter @jnj/types build \
 && pnpm --filter @jnj/database build \
 && pnpm --filter @jnj/api build

# ── Production image ──
FROM node:20-slim AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY --from=base /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=base /app/packages/types/package.json packages/types/
COPY --from=base /app/packages/types/dist packages/types/dist
COPY --from=base /app/packages/database/package.json packages/database/
COPY --from=base /app/packages/database/dist packages/database/dist
COPY --from=base /app/packages/database/migrations packages/database/migrations
COPY --from=base /app/packages/database/drizzle.config.ts packages/database/
COPY --from=base /app/apps/api/package.json apps/api/
COPY --from=base /app/apps/api/dist apps/api/dist

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3005
ENV PORT=3005 HOST=0.0.0.0 NODE_ENV=production
CMD ["node", "apps/api/dist/server.js"]
