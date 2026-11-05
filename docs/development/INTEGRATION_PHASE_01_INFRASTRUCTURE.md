# Integration Phase 01 — Infrastructure, Vercel and Supabase readiness

**Status:** code/configuration gate implemented; deployment access, database connectivity, real migrations, and operational acceptance **NOT yet verified**.

## Goal and safety boundary
Connect one SmartHub Vercel application to the intended SmartHub Supabase infrastructure, separated into staging and production. Do not invent data, publish private database credentials, create financial activity, apply schema migrations, or delete another database while performing Phase 01 preflight.

## 1. Existing verified code
- Phases 06–18 are merged on `main`. The marketing/public routes passed static/SSR/Chromium checks without a live database.
- Supabase Auth, private Storage, Prisma ORM v7, and the PostgreSQL schema/migration files are implemented. The deployment environment is not confirmed in the currently linked Vercel/Supabase tool accounts.
- A `staging` manual GitHub Actions release workflow already exists with separate reviewed staging and production Supabase references, strict TLS/project matching, backup approval before migrations and five-role acceptance. It has not been run against real staging.

## 2. Single authoritative backend
Use Supabase for **PostgreSQL + authentication + private evidence Storage**. Do not connect a separate Prisma Postgres/Vercel Postgres instance to `DATABASE_URL` or `DIRECT_URL`. If a second database integration was installed in Vercel, identify its ownership/data before disconnecting and do not delete any database without verified backups and owner approval.

## 3. Environment separation
| Variable | Production | Staging |
|---|---|---|
| `SMART_HUB_PRODUCTION_SUPABASE_REF` | Exact reviewed production project reference | Same production ref, for explicit mismatch checking |
| `SMART_HUB_STAGE_SUPABASE_REF` | Leave unused | Different, independent staging project ref |
| `NEXT_PUBLIC_SUPABASE_URL` | HTTPS URL of the production project | HTTPS URL of the staging project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production publishable key | Staging publishable key |
| `DATABASE_URL` | Supabase **transaction pooler** port 6543 | Staging transaction pooler port 6543 |
| `DIRECT_URL` | Direct port 5432 or session pooler port 5432, used only by controlled migrations | Same connection types for staging only |
| `APP_BASE_URL` | Actual HTTPS production web origin | Actual HTTPS staging/preview origin |
| `AUTH_RECOVERY_SECRET` | Unique 32+ character private secret | Different 32+ character private secret |
| `SUPABASE_SECRET_KEY` | Server-only key, required for restricted invitations | Separate staging server-only key |
| `FARMER_BANK_ENCRYPTION_KEY` | 32-byte Base64 AES key; protect as a persistent encryption key | Separate staging key |
| `SMART_HUB_DB_POOL_MAX` | Start at `3`, adjust from observed capacity | Start at `3` |

Other relevant settings:
- `PUBLIC_SIGNUP_ENABLED=false`, `PAYMENTS_ENABLED=false`, `SUPPLIER_PAYOUTS_ENABLED=false` during bootstrap.
- `RELEASE_ACCEPTANCE_ENABLED=false` in **production**; staging may temporarily set it `true` with a separately generated `RELEASE_HEALTH_TOKEN`.
- `FIELD_EVIDENCE_BUCKET=field-visit-evidence`, `SHIPMENT_EVIDENCE_BUCKET=shipment-evidence`, both *private*; verify against actual staging storage after migrations.
- `PUBLIC_CONTACT_ENABLED=false` until real contact database, legally approved privacy terms and Cloudflare Turnstile are active; it also requires `CONTACT_HASH_SECRET`.
- No secret should ever be prefixed `NEXT_PUBLIC_` except non-secret Supabase project URL and publishable key, and (when active) the non-secret anti-bot site key.

## 4. Connection strings and security
- Runtime Supabase Supavisor **transaction mode** uses `<region>.pooler.supabase.com:6543` and username `postgres.<project-ref>`. This is preferred for short-lived Vercel serverless functions.
- Migrations use direct `db.<project-ref>.supabase.co:5432` if reachable over IPv6 or Supavisor **session-mode** `<region>.pooler.supabase.com:5432` on IPv4-only infrastructure. **Never migrate over transaction mode 6543.**
- Add an explicit `sslmode=require` or a stronger TLS verification mode to both URLs. Percent-encode reserved characters in the database password. Use private secrets, not source code or build logs. Credentials previously shared in chat should be rotated before production use.
- Do not rotate `FARMER_BANK_ENCRYPTION_KEY` for a database containing encrypted payout details without a reviewed re-encryption/key-version migration.
- Do not change `DATABASE_URL` to a Vercel/Prisma Postgres database just because it appears as `POSTGRES_URL` or `POSTGRES_PRISMA_URL` in the Vercel integration panel.

## 5. Offline safe preflight
Run after injecting the intended environment variables **inside the selected approved environment** (never paste secrets into chat or CI logs):

```bash
npm run verify:deployment-env -- --production
# Or use a separate restricted staging environment:
npm run verify:deployment-env -- --staging
```

This reads environment variables only; it never contacts the database, runs migrations, or reveals keys. It refuses mismatched project refs, unrelated PostgreSQL providers, missing TLS, transaction-mode migration URLs, unapproved initial launch flags and inadequate recovery secrets. Warnings include extra `POSTGRES_*` integrations and missing optional service keys.

## 6. Connection scalability
- `getPrisma()` now reuses a single Prisma client/pool per warm Next.js process in production and development rather than constructing a fresh pool for every call.
- The Prisma 7 `@prisma/adapter-pg` pool is bounded to three connections per warm function by default, with five-second acquisition/connect timeout and ten-second idle timeout. Adjust `SMART_HUB_DB_POOL_MAX` conservatively based on Supabase pool settings and measured Vercel concurrency; this bound is **per warm function**, not the total project maximum.
- Measure `pool size × concurrent instances` as well as query latency, long transactions and Supavisor queueing before tuning. No capacity benchmark has been run yet.

## 7. Real staging acceptance — do not skip
1. Verify ownership/team access to the actual Vercel project (this conversation's linked Vercel account cannot locate it) and confirm GitHub `main` is the deploy source.
2. Verify the existing SmartHub Supabase production project reference; rotate exposed database/admin credentials.
3. Provision or connect a **separate** SmartHub staging Supabase project. Never run experimental migrations against the production project.
4. Configure a protected GitHub Actions `staging` environment and add the exact secrets/vars listed in `docs/development/PHASE_17_RELEASE_ACCEPTANCE.md` and this document, including staging Auth recovery secret and farmer encryption key.
5. Run `verify:deployment-env --staging` and existing `stage-target.mjs` first; confirm **both pass without connecting**.
6. Take an approved snapshot and perform an *isolated restore test*. Obtain explicit reviewed approval before any `prisma migrate deploy` against staging.
7. Run the existing controlled `staging-acceptance.yml` workflow only against the verified target, including RLS/private Storage, real stage Auth sessions, cross-buyer boundaries, and Chromium.
8. Test real server actions against staging, with audited disposable accounts, published catalogue content and Paystack **test** transactions only.
9. Perform separate rollout go/no-go review for production environment and data. Never auto-apply staging or production database migration by merely pushing to GitHub.

## Current blockers
- Current connected Vercel account does not surface `smarthub-agrochain`; confirm the correct Vercel user/team connection.
- Current Supabase connector cannot access an authorized project link. A web URL/publishable key does not grant authorized database access through the connector.
- No separate staging database, current migration history, role sessions, staging backup restore or active production database configuration was verified.
- No live money movement is authorized or attempted.

**References:** Supabase Postgres connection docs `https://supabase.com/docs/guides/database/connecting-to-postgres` and Prisma v7 database connection guidance `https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections`.
