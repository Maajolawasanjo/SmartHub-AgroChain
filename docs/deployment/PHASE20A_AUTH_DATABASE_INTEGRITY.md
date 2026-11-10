# Phase 20A — Bind Auth, application runtime and V2 production database

**Status (10 November 2026):** reviewed source hardening and **read-only live schema inventory**; not a real-user Auth, SMTP/SMS, database connection from Vercel, or five-role end-to-end acceptance certificate.

## Project boundary

- This phase applies ONLY to `Maajolawasanjo/SmartHub-AgroChain` and the redesigned `smarthub-agrochain-v2` deployment.
- The approved existing SmartHub AgroChain V2 Supabase project reference is `ematieqwxoiwoovmqdba`, currently labeled **TAIMAKO Care** in the connected Supabase workspace. The label is not an authorization to use a different company's project; the original association was explicitly reviewed in the existing SmartHub release registry.
- The original **SmartHub Agronexus** app and its `.online` domain/database remain **completely separate**. No GitHub, Vercel, Supabase or DNS operation on Agronexus is authorized.

## Read-only provider facts checked on 10 November

Supabase project was reported `ACTIVE_HEALTHY`, PostgreSQL 17, project region `eu-west-1`. An information-only SQL query returned:
- **73** application tables in `public`, all **73** RLS-enabled.
- **17** completed Prisma migration ledger entries.
- **0** existing Supabase Auth users and **0** `app_accounts`.
- **0** Supabase development branches listed in this connected account.

These figures do **not** verify all 17 checksums against latest GitHub, SMTP, delivery, production Vercel environment values, real sign-in, RLS under individual actors, backups, live payment provider or the rest of the client requirements. No data or schema changes were made.

## Implemented protection

Before **any server-side Auth provider call**, `authConfigReady()` now invokes `assertRuntimeDatabaseTarget(DATABASE_URL)`. This ensures that the Supabase public Auth origin and private Prisma database point to the **same** verified project, using an HTTPS Auth origin, a TLS-enforced DB URL and the correct Vercel environment isolation.

The production guard also pins the owner-reviewed V2 project reference. Previously an arbitrary syntactically valid project ref could be provided consistently as `NEXT_PUBLIC_SUPABASE_URL`, `SMART_HUB_PRODUCTION_SUPABASE_REF` and `DATABASE_URL` without detection. That is now rejected in Vercel production. Changes to a future real production project require a deliberate reviewed source, data migration and release update. No hidden password or key is embedded in source.

The guard covers login, signup, recovery, account service calls and database entrypoints. A wrongly linked Auth/DB environment must now expose service-unavailable behavior rather than issue cookies in the wrong project. Preview deployments still require a distinct non-production Supabase project.

## Owner's required V2 environment verification (names only)

In **V2 Vercel project Settings → Environment Variables**, inspect the correct Production environment. Do not share values, passwords, secret keys or access tokens in chat.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: must belong to reviewed V2 Supabase ref.
- `SMART_HUB_PRODUCTION_SUPABASE_REF`: approved ref, required for production.
- `DATABASE_URL`: private TLS-enforced project-matching Supabase transaction pooler, typically port 6543.
- `DIRECT_URL`: separate approved project-matching TLS direct/session connection on port 5432, used for migration-only workflows, not any production auto-migrate.
- `APP_BASE_URL`: exact V2 `https://smarthub-agrochain-v2.vercel.app` canonical browser origin until any separately approved V2-only domain is assigned. Never point to the Agronexus `.online` domain.
- `AUTH_RECOVERY_SECRET`: random server-only secret length at least 32; `SUPABASE_SECRET_KEY` for restricted admin functions, never public.
- Keep `PUBLIC_SIGNUP_ENABLED=false`, `PAYMENTS_ENABLED=false`, `PAYSTACK_LIVE_ENABLED=false`, `SUPPLIER_PAYOUTS_ENABLED=false`, `RELEASE_ACCEPTANCE_ENABLED=false` pending real service acceptance.

A Next.js build on GitHub does not validate whether Vercel has correctly configured these values. If V2's credentials do not match, Auth intentionally reports unavailable until configured.

## Required next acceptance work

1. Obtain an isolated, owner-approved non-production Supabase project and an isolated V2-only preview/staging origin. Do **not** use Agronexus or the existing V2 main backend as disposable staging.
2. Configure preview-only Auth redirect, email/SMS and private Storage; test the five distinct roles with disposable users and no live money. Do not enable public signup until legal and identity approvals.
3. Run protected stage migration-inventory/HTTP/browser flows and negative cross-role access checks. Record evidence and exact URLs/SHAs, without exporting private user data.
4. Verify V2 deployed main SHA with Phase 19 `verify:v2-deployment`, validate runtime DB connectivity via approved protected health check, and prove login/logout/email recovery with test users.
5. Only then review the remaining R00 owner-decision gates and advance Phase 20 to integration-complete.

This document is not permission to move any Agronexus domain or database. All instructions concern V2 only.
