# Integration Phase 02 — Real staging database activation

**Status:** Code and CI staging preflight implemented. No live database, migration, user records or payment have been accessed in this work.

## Required environment boundaries

- Production: existing SmartHub Supabase, but first rotate the database password and server-only key shared in chat. Never commit either to Git.
- Staging: a DIFFERENT dedicated Supabase project, isolated Auth users, private Storage buckets, and matching HTTPS staging app deployment.
- GitHub Actions: protected environment named staging with independent reviewer approval and secret values stored as protected environment secrets, not source files.
- Vercel: the project in the correct account/team; choose the existing Supabase database rather than another Prisma Postgres provider. Use distinct Preview and Production environments.

The staging workflow rejects a staging ref matching the independently reviewed production ref. Prisma runtime requires a TLS transaction pooler on port 6543; migration requires TLS direct or session mode on port 5432.

## A. READ-ONLY discovery (new default)

1. Configure stage URL, staging and production refs, staging database URLs and separately reviewed HTTPS origins in the protected GitHub Actions environment. Set both database URLs to require TLS.
2. Open GitHub Actions and choose "SmartHub controlled staging preflight and acceptance" then "Run workflow".
3. Leave **preflight_only=true** and **apply_migrations=false** (the defaults).
4. The job runs the strict stage target guard, installs dependencies, and runs the new preflight database inspector in a repeatable-read, READ-ONLY transaction. It reads ONLY: database name, Supabase role names, public table names and their RLS flags, Prisma migration names, hashes and status. It does not read business rows or mutate data.
5. The result contains redacted counts and a state: empty, partial or complete. Fail on migration checksums that differ, unfinished migrations, unrelated public tables, missing history for existing tables, or disabled RLS.
6. The workflow stops after inspection, without running app acceptance, user sessions or Prisma migrate deploy.

Fresh staging has zero application tables and 17 pending migrations. A complete staging environment should contain all 17 migrations and 73 Prisma model tables with RLS enabled. Any mismatch needs an independent engineer's review; never reset, delete migration history or overwrite an existing database to force a green result.

## B. Approved staging migration / full acceptance

1. Review the exact migration SQL and any existing schema and records, run a real isolated backup restore, and obtain explicit independent staging environment approval.
2. Set STAGING_MIGRATIONS_APPROVED=true and record verified STAGING_BACKUP_RESTORE_EVIDENCE in the protected workflow environment. Reviewer must confirm evidence is genuine.
3. Run the workflow with preflight_only=false, apply_migrations=true. The preflight runs BEFORE migration; only then static checks, approval gate and reviewed Prisma migrate deploy.
4. Strict checks follow: full migration history, schema, private RLS/Storage and financial invariants. Provide genuine isolated staging sessions for Buyer A, Buyer B from a different organization, Farmer, Field Agent, Operations and Super Admin. Run cross-role read-only HTTP and Chromium acceptance.
5. If staging is already fully migrated, select preflight_only=false and apply_migrations=false to run acceptance without changing schema.
6. Do NOT enable live Paystack keys, supplier payouts or unrestricted public registration in staging.

## Local source validation

Run npm ci, npm run db:generate, npm test, npm run typecheck and npm run build. All are source-level and do not prove a live database connection.

## Remaining external blockers

The ChatGPT-connected Supabase account does not currently expose the SmartHub project. The Vercel integration cannot find the SmartHub Vercel project shown by the user. No separate staging ref, protected environment or backup restore evidence has been verified. Therefore this phase does not apply migrations or certify production; it prepares a reviewed, fail-closed route to safely do so.

## After database activation

Test real Supabase Auth/RLS with five roles and two independent buyer organizations, private Storage, farmer onboarding, actual sourcing/stock concurrency, Paystack sandbox reconciliation, receipt and delivery disputes, supplier settlement approval, error monitoring, rollback and controlled pilot.
