FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Install deps ──
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/types/package.json packages/types/
COPY packages/database/package.json packages/database/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# ── Copy source & build ──
COPY packages/types/ packages/types/
COPY packages/database/ packages/database/
COPY apps/web/ apps/web/
COPY tsconfig.base.json ./

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @jnj/types build \
 && pnpm --filter @jnj/database build \
 && pnpm --filter @jnj/web build

# ── Production image ──
FROM node:20-slim AS runner
WORKDIR /app

COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static apps/web/.next/static
COPY --from=base /app/apps/web/public apps/web/public

EXPOSE 3011
ENV PORT=3011 HOSTNAME=0.0.0.0 NODE_ENV=production
CMD ["node", "apps/web/server.js"]
