# Phase 20B — real database migration acceptance without a cloud staging project

**Status: new disposable PostgreSQL CI job; run results and real provider acceptance must be checked separately.**

## Why this gate exists

Supabase refused a development branch because the connected organization requires Pro or above for branching. A separately proposed $0/month staging project was then rejected because the owning member had reached the two-active-free-project cap. No separate cloud staging project has been created, and the V2 production database is not a safe disposable integration target.

This source milestone adds an **ephemeral PostgreSQL 17 service** to the existing PR workflow. The GitHub runner destroys its container when the job ends. GitHub Actions automatically manages the container lifecycle; it is not a permanently provisioned cloud database. This may consume normal GitHub Actions minutes but creates no paid Supabase resource.

## Exact scope and safety

- Uses **only** a fixed disposable `127.0.0.1:5432/postgres` connection with a literal non-production CI password. **No Supabase/production secrets are provided**, accepted or needed.
- Runs only in this repository's GitHub Actions environment with `SMART_HUB_CI_POSTGRES_ONLY=I_ACKNOWLEDGE_EPHEMERAL_POSTGRES`. The script refuses nonlocal URLs, missing consent, Vercel context, production/staging Supabase refs and public/secret Supabase environment values.
- The job creates only the two Supabase-compatible **SQL role names** (`anon`, `authenticated`) and a minimal, local `storage.buckets` metadata table needed to exercise the two private-evidence-bucket migration statements. This is *not* a recreation of Supabase Auth, GoTrue, SMS, or Storage APIs.
- Calls the **real Prisma 7 `migrate deploy`** CLI against that disposable database, without invoking the production/staging-gated `npm run db:migrate` command.
- Validates every checked-in migration name, SHA-256 checksum, successful completion and absence of unknown remote ledger entries.
- Checks each checked-in Prisma model table exists, has RLS enabled, and has no direct SELECT/INSERT/UPDATE/DELETE privileges granted to either client role.
- Reads the two staged private Storage bucket metadata rows to confirm they are nonpublic and have the intended size and MIME types.
- Executes a genuine PostgreSQL `SELECT` as `anon` and `authenticated` against `app_accounts` and requires an actual SQL permission-denied error, rather than treating empty tables as evidence of authorization.
- Rejects any nonempty `app_accounts` records in the brand-new test database.

## What a green run does and does not mean

**Proves:** the repository's migrations can apply from an empty PostgreSQL 17 database, the Prisma model tables and RLS/grants match source, and the reviewed local evidence-bucket SQL is executable.

**Does not prove:** real Supabase Auth sign-up/login/verification or JWT revocation, Supabase Storage API policies, email/SMS delivery, role provisioning, private cross-organization HTTP authorization, live V2 environment values or protected Preview deployment.

**Remaining Phase 20B blockers:** an owner-authorized **truly isolated** Supabase project in an organization with an available slot or suitable plan; Ma'ajo Vercel project access; disposable five-role accounts; confirmed email and SMS providers; execution of real protected staging acceptance. Never use the independent SmartHub Agronexus repository, domain, database, or keys.

## Execution

Automatically runs as the `isolated_postgres` job on a feature-branch push or pull request targeting `main` through `.github/workflows/ci.yml`. No manual production credentials or migrations are needed. The script is `scripts/release/ci-postgres-integration.mjs`.

See [Phase 20B acceptance tracker](https://github.com/Maajolawasanjo/SmartHub-AgroChain/issues/68). Do not mark Phase 20B complete from CI alone.
