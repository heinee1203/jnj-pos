# JNJ POS — School Supply & Merchandise POS

## Project Structure
pnpm monorepo with 3 apps + 2 shared packages:
- `apps/api` — Fastify 5 modular monolith (backend)
- `apps/web` — Next.js 15 admin & POS frontend
- `apps/mobile` — React Native mobile app
- `packages/database` — Drizzle ORM schema, migrations, seed
- `packages/types` — Shared enums, Zod schemas, TS interfaces

## Commands
- `pnpm dev` — Start API dev server (port 3000)
- `pnpm web:dev` — Start web frontend (port 3010)
- `pnpm build` — Build all packages for production
- `pnpm db:generate` — Generate Drizzle migrations from schema changes
- `pnpm db:migrate` — Run pending migrations against Postgres
- `pnpm db:seed` — Seed sample products
- `pnpm db:studio` — Open Drizzle Studio for DB exploration
- `docker compose up -d` — Start local Postgres (port 5434)

## Architecture
- **Multi-tenant:** Shared DB, every query filtered by `org_id`
- **Store-context:** `X-Location-ID` header required on all data routes
- **Auth:** JWT via `@fastify/jwt`
- **Pagination:** Keyset cursor-based (`?cursor=<uuid>&limit=50`)

## Domain Model
- **Case/Piece selling:** Products have `piecesPerCase` (conversion factor). POS sells by piece or case.
- **Tiered pricing:** `price_tiers` table with min/max qty thresholds per product.
- **Inventory:** Always stored in base unit (pieces). Display shows "120 pcs (5 cases)".
- **Procurement:** POs default to case quantities. Receiving converts to base units.

## Key Files
- `apps/api/src/app.ts` — Plugin registration
- `apps/api/src/plugins/auth.ts` — JWT auth
- `apps/api/src/plugins/store-context.ts` — Location context
- `packages/database/src/schema/` — One file per table
- `packages/database/src/schema/price-tiers.ts` — Tiered pricing
- `packages/types/src/enums.ts` — Domain enums
- `packages/types/src/schemas.ts` — Zod validation

## Database
- PostgreSQL 16 (Docker on port 5434)
- Drizzle ORM with postgres driver
- Docker: user=jnj, password=jnj_secret, db=jnj_dev
- Seed admin: admin@jnj.com / admin12345

## Environment
- `.env` at monorepo root (not in packages)
- `DATABASE_URL=postgresql://jnj:jnj_secret@localhost:5434/jnj_dev`

## Color Scheme
Professional blue: primary #1E40AF, accent #3B82F6, sidebar #0F172A, background #F8FAFC
