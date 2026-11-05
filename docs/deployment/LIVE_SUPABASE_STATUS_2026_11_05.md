# SmartHub AgroChain — TAIMAKO Care database activation (5 November 2026)

Verified project: `ematieqwxoiwoovmqdba` (`https://ematieqwxoiwoovmqdba.supabase.co`). This is the existing project used at the user's request; no paid development branch was created.

## Completed in the database
- All 17 reviewed Prisma migration SQL files from GitHub commit `62fe867fdcf2dd9a74be9d0e0ef9f8e7d0821dcf` were applied in chronological order via Supabase's migration facility.
- Supabase migration history records those 17 migrations. A private `public._prisma_migrations` baseline ledger was created containing 17 completed entries and SHA-256 checksums calculated from those exact repository migration sources, to preserve Prisma's future deployment path.
- Schema verification: 73 Prisma application tables, 688 scalar/enum columns present, 144 foreign keys, RLS enabled on all application tables, no anon/authenticated table privileges, two private evidence storage buckets.
- The baseline has no authenticated users, orders, or payment attempts. Read-only inventory, cross-organization and financial invariant queries returned no violations.
- Security linter: `rls_enabled_no_policy` is informational; the architecture intentionally restricts table access to server-owned APIs and revokes anon/authenticated grants. Do **not** add permissive RLS policies merely to clear the informational finding.
- Performance linter: 56 unindexed foreign-key suggestions and 83 unused indexes on the fresh empty database. Prioritize indexes from observed query plans and workloads rather than creating every suggested index blindly.

## Still required before deployment
1. In the actual Vercel SmartHub project set the public Supabase URL and publishable key belonging to this project. Configure server-side `DATABASE_URL` using the project's official TLS-enabled runtime connection string (transaction-mode pooler usually on port 6543); configure `DIRECT_URL` only for reviewed migrations.
2. Set `SMART_HUB_PRODUCTION_SUPABASE_REF=ematieqwxoiwoovmqdba` in the production deployment. Preview builds must have a *different* staging ref and project; do not point previews at this database.
3. Set `APP_BASE_URL` to the real production HTTPS domain. Keep `PAYMENTS_ENABLED=false`, `PAYSTACK_LIVE_ENABLED=false`, `SUPPLIER_PAYOUTS_ENABLED=false`, and `PUBLIC_SIGNUP_ENABLED=false` until acceptance checks pass.
4. Confirm Supabase Auth redirect/callback domains, publishable and server credentials, recovery settings, and private Storage service access.
5. Run live `Prisma.$queryRaw SELECT 1` connectivity, authentic sign-in/permissions for all five roles, buyer/farmer/org separation, sourcing/quotes, inventory reservation, order, Paystack test-mode checkout, shipment, and financial reconciliation.
6. Verify backups and a restore runbook before admitting production traffic. The database started empty; an isolated restore drill has **not** been performed.

The connected Vercel account returned no project matching SmartHub's name or GitHub repository. This document is not proof of a running deployment or financial production readiness. No user records, actual charges or payouts were created as part of the database schema activation.
