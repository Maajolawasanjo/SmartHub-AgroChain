# Production database — read-only inspection

Use this command **only** against the approved existing SmartHub Supabase project.
This is an inventory of migration metadata, public table names, and RLS flags.
It does not run migrations, alter credentials, inspect business rows, or modify any records.

## Secure invocation

Set these values in the approved private deployment environment (never commit or print the database URI):
- `SMART_HUB_PRODUCTION_SUPABASE_REF`: reviewed 20-character production project reference
- `NEXT_PUBLIC_SUPABASE_URL`: exact matching HTTPS Supabase project origin
- `DIRECT_URL`: private production direct connection (5432) or Supavisor session connection (5432), with TLS required
- `RELEASE_PRODUCTION_READONLY_CONFIRM=I_APPROVE_READONLY_PRODUCTION_INVENTORY`: explicit one-time authorization for read-only inspection
- `RELEASE_ACCEPTANCE_ENABLED=false`: production readiness endpoint remains disabled

Run `npm run db:inspect:production` only in the trusted runtime where those values are configured.

## Interpretation

- `empty`: no Prisma history and no application tables; not a migrated production deployment
- `partial`: review outstanding migrations, RLS, or unknown schema objects before any deployment
- `complete`: locally reviewed migration checksums match and expected model tables have RLS enabled

A passing read-only inventory is **not** proof that authentication, Storage, payment integrations, and real buyer/farmer transactions work. Do not run `db:migrate` against production based solely on this report. Existing data requires a separate reviewed backup, migration plan, and rollback procedure.

The script fails closed if the configured project does not match the approved production reference, if TLS is not configured, or if the direct connection uses the transaction pooler.
