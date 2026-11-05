# Integration Phase 01 — Isolated Supabase + Vercel activation

**Current status: source-level configuration safeguards implemented; no live database was accessed or migrated.** This is an environment runbook, not a production-readiness certificate.

## 1. Trust boundary and assets

- Canonical source: GitHub `main`, with frontend and backend on Vercel.
- One **dedicated production** SmartHub Supabase project for PostgreSQL, Auth and private Storage.
- One **separate staging** SmartHub Supabase project, with its own Auth users, files and test Paystack credentials. Never connect Preview/staging to the production project.
- Prisma ORM uses `DATABASE_URL` to run application queries and `DIRECT_URL` for migrations through `prisma.config.ts`. Keep both private in the server environment. Neither is exposed with `NEXT_PUBLIC_`.
- The optional Prisma Postgres integration on Vercel is not required: do not let its generated `POSTGRES_URL` or `DATABASE_URL` replace the approved Supabase connection.
- Supabase credentials exposed in chat must be **rotated** in Supabase before a production release. Never commit secrets to GitHub, GitHub Actions logs, or browser-visible files.

## 2. Configure your Vercel project in the correct account/team

1. Verify the new Vercel project is linked to `Maajolawasanjo/SmartHub-AgroChain` with production branch `main`. Make sure the Vercel connection used by release automation belongs to the same team; the ChatGPT-connected Vercel account did not list this project when checked.
2. Disable/remove the *project connection* to the extra Prisma Postgres provider if it is not required. **Do not delete its database** before checking whether it contains valuable records.
3. Set production environment variables in the Vercel dashboard and verify their **names**, using the existing `.env.example` as the authoritative list. For Preview, use the separately provisioned staging Supabase credentials.
4. Set `APP_BASE_URL` to the exact **HTTPS origin** of each deployment (without paths, trailing configuration query or embedded credentials). Do not use `http://localhost:3000` for Vercel production.
5. Ensure sensitive variables are private. `SUPABASE_SECRET_KEY`, DB URLs and app encryption/HMAC/recovery keys must never carry a `NEXT_PUBLIC_` prefix.
6. Disable `PAYMENTS_ENABLED`, `SUPPLIER_PAYOUTS_ENABLED`, `PUBLIC_SIGNUP_ENABLED` until their release acceptance gates pass. Keep public contacts disabled until the privacy/Turnstile flow is approved.

## 3. Connection URL policies (Supabase)

Use the connection strings copied **from the correct Supabase project's Connect screen**, not strings reconstructed from guessed regions.

| Variable | Recommended origin and mode | Important |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public project HTTPS endpoint | Must belong to the exact environment's Supabase project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable project key | Only public credential used by the browser |
| `DATABASE_URL` | Supavisor shared **transaction-mode** pooler, port **6543** | For Vercel/Prisma runtime; preserve the project-qualified database username |
| `DIRECT_URL` | Direct DB host port **5432**, or shared **session-mode** pooler port **5432** | Migrations only; never use 6543 |
| `SUPABASE_SECRET_KEY` | Supabase server-only secret | Use exclusively in server-side operations |
| `SMART_HUB_PRODUCTION_SUPABASE_REF` | Independently confirmed production project reference | Supplied to the staging GitHub Actions preflight; must differ from staging reference |

Add `sslmode=require` (or approved stronger SSL verification) to BOTH PostgreSQL URLs and, for transaction mode, preserve any provider-supported pooler options. The pooler username contains a `.<project-ref>` suffix; the standard direct username is `postgres`. Only an actual matching project hostname, username and port are accepted by the checks. URL-encode special characters in the password rather than pasting raw reserved characters.

**Important:** Session-mode port 5432 is documented by Supabase for Prisma migrations from IPv4-only environments. The previous Phase 17 guard incorrectly rejected it; the new guard permits it while rejecting unrelated projects and all transaction-mode migrations. Ref: https://supabase.com/docs/guides/database/prisma and https://supabase.com/docs/guides/database/connecting-to-postgres

## 4. Configure source-level release safety

From a local checkout of the reviewed release branch, with secrets in an ignored local `.env`, run:

```bash
npm ci
npm run db:generate
npm run typecheck
npm test
npm run verify:integration-config -- --environment=staging
```

The audit is **offline**: it parses environment variable structure, never connects to the database, and prints only missing variable names and generic errors/warnings. Use `--environment=production` only with the reviewed production configuration. A passing audit is **not** proof that the database or external services are reachable.

Required for the **manual staging Actions workflow**:
- Set `SMART_HUB_STAGE_SUPABASE_REF` to the staging project reference.
- Set `SMART_HUB_PRODUCTION_SUPABASE_REF` to the different, independently reviewed production reference.
- Set the stage-specific URL/key, DB URLs, session cookies, reviewed stage origin and distinct production origin as described in `PHASE_17_RELEASE_ACCEPTANCE.md`.
- Add `sslmode=require` to each database URL.
- Select a protected GitHub Actions `staging` environment requiring an independent reviewer. The workflow is manual-only. It can apply migrations **only** after explicit approval and a documented successful restore test.

## 5. No unreviewed production mutations

**Order of operations**:
1. Confirm which Supabase project is production and which is staging, then rotate exposed secrets.
2. Review the current production database contents and `_prisma_migrations` **read-only**. Existing tables and customers may require a baseline/diff, not blindly running an initial migration.
3. Prepare separate staging, review migration SQL and the full backup/restore process, and apply migrations to staging only after explicit approval.
4. Run `node scripts/release/check-stage-database.mjs`, then `node scripts/release/check-stage-http.mjs` and genuine authenticated browser tests with authorized staging records and no live payments or payouts.
5. Validate each role with real staging accounts, cross-organization boundaries, Storage ACLs, field evidence and simulated sourcing → quotation → Paystack TEST payment → receipt → independently verified supplier settlement.
6. Review full operational, financial, legal, security and recovery signoffs. Only then consider applying reviewed production changes, enabling public onboarding, and activating provider transactions.

Never run `prisma db push`, `prisma migrate reset`, direct DDL, arbitrary seed scripts or `prisma migrate deploy` against production just because a CI test passed.

## 6. Current external blockers

- The ChatGPT-connected Supabase account did not expose the SmartHub project; its project listing request was rejected as unlinked.
- The ChatGPT-connected Vercel account could not find the Vercel SmartHub project, although the user's screenshot showed it had been created in another account/team context.
- No staging project, backup/restore evidence, real account session set or provider TEST acceptance was available to execute safe live integration testing.
- All supplied database credentials and server-only keys should be rotated before sharing the new credentials with Vercel's encrypted/sensitive environment variable store.

**Code acceptance:** GitHub CI can verify syntax, TypeScript, Prisma schema and regression tests of the new environment guards. An isolated staging deployment with read-only probes and approved migrations remains the next necessary operational milestone.
