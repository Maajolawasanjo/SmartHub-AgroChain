# Phase 20B — Supabase SSR proxy integration and staged acceptance boundary

**Status: source correction pending CI; real five-role/provider acceptance remains BLOCKED.**

## Project scope

SmartHub AgroChain V2: `Maajolawasanjo/SmartHub-AgroChain`, Vercel `smarthub-agrochain-v2`, and the reviewed existing Supabase project ref `ematieqwxoiwoovmqdba`.

**SmartHub Agronexus is a separate unrelated application.** Its repository, Vercel project, domain `www.smarthubagrochain.online`, database, secrets and data must never be modified, tested against, connected or moved by this phase.

## What was found

Phase 20A made `authConfigReady()` verify the same reviewed private Prisma database as the Supabase Auth project. However, Next.js `src/proxy.ts` previously created a Supabase SSR client when **only** `NEXT_PUBLIC_SUPABASE_URL` and the public key were present. This bypassed Phase 20A's tenant identity, TLS, deployment environment and recovery-secret preflight **before** the route handlers were reached. A partially configured Vercel environment could attempt Auth cookie refresh against the wrong Supabase tenant.

This phase fixes the gap: the proxy now uses the existing `authConfigReady()` guard **before** any `createServerClient` or `getClaims` call. If the reviewed Auth/DB pair is unavailable, the proxy leaves the public website accessible without attempting cross-tenant provider access. Protected app pages and mutations still independently require the provider-confirmed user, authoritative DB role and account status, and additional verified email/phone checks.

Proxy session refresh remains supported for a correctly configured environment. A transient `getClaims` provider exception no longer turns unrelated public pages into an HTTP 500; it is not treated as evidence of authorization. Refresh tests simulate cookie writes and provider outages with local mocks, never real users or live Supabase credentials.

## Evidence checked on 14 November 2026 (READ-ONLY)

In connected Supabase `ematieqwxoiwoovmqdba`:
- Project reports `ACTIVE_HEALTHY`.
- `auth.users`: **0** users; `public.app_accounts`: **0** records.
- Prisma migration ledger: **17** completed entries; RLS-enabled public application tables: **73**.
- No separate development/staging branch was listed.

Those observations do NOT prove end-to-end Auth, SMS, live SMTP, browser sessions, database migration checksum parity or operational connectivity to Vercel.

## Remaining requirements to complete Phase 20B

1. Authorize the Ma'ajo Vercel team in the deployment connector. The current connector remains HTTP 403; direct access to V2 project runtime configuration is not available.
2. Obtain owner approval for an independently isolated **nonproduction** Supabase database/Auth project, including potential costs. Do not reuse either production project.
3. Configure restricted staging origin, protected GitHub staging environment, approved secrets, email and SMS test provider settings, and separate private Storage buckets. Keep public signup, payments, payouts and mandatory MFA disabled until separately signed off.
4. Provision genuine disposable buyer A/B, farmer, field agent, operations and super admin staged test identities; test provider-verified email, SMS, recovery, staff invitations, session refresh, logout and negative cross-role/account isolation using the existing protected acceptance workflows.
5. Record actual executed run IDs, deployed SHA, real provider results, migration and authorization evidence. Do not mark this phase complete based solely on green CI, successful Vercel build or static simulation.

**No schema changes, Auth user creation, credential reads, migrations, database writes, live payment activation, or Agronexus modifications are part of this source milestone.**


## Phase 20B read-only access-denial checker hardening (14 November)

The protected `scripts/release/check-stage-http.mjs` previously treated **every HTTP status other than 200** as proof that another role, an anonymous visitor, or a different buyer was blocked. This generated a dangerous false positive: HTTP 500/503, rate limits or redirects to unrelated pages could all make a broken application appear to pass role isolation.

The checker now uses `scripts/release/staging-access-denial.mjs` for all five categories of denied access: cross-role workspaces, anonymous workspaces, Operations attempting Super Admin CSV, anonymous CSV export, and Buyer B attempting Buyer A's private shipment/support case. Only explicit `401`, `403`, `404` or a manual **same-origin** redirect to a known login/verification/forbidden destination count as denial. A missing Location, cross-origin redirect, unexpected destination, 5xx, 429 or another status **fails** staging acceptance.

New `tests/phase20b-staging-denial.test.mjs` exercises status and redirect allowlists and proves the five actual staging checks use the strict helper. The live stage HTTP workflow remains manually dispatched, read-only `GET` only, and requires the independent V2-only staged database and cookies. Nothing in this change activates a real account or authorizes a production rollout.


## Phase 20B stage/browser access-policy reconciliation

A second acceptance discrepancy was identified: the application's authoritative `mayAccess`, Operations layout and `requirePortal("OPERATIONS")` all permit **SUPER_ADMIN** to access the Operations workspace, but the original five-role staging HTTP suite expected every role to be denied all other portal workspaces, including this intentional permission. The suite now asserts **HTTP 200 for Super Admin → Operations**, while preserving denials for every unauthorized cross-role pairing.

The Playwright staging suite has been upgraded from a Buyer-only/Ops-only negative check to a full five-role cross-workspace matrix with the same Super Admin exception. Browser tests previously considered `500`, `503`, or any arbitrary redirect to be authorization denial because they merely compared status or final pathname. The shared `assessBrowserDenial` classifier now accepts only explicit 401/403/404 or an actual successful redirect to an allowlisted **same-origin** authentication/verification/forbidden page. The Buyer A / Buyer B private-shipment and support-case browser checks use the same classifier.

These improvements require genuine isolated staging accounts and are **not** evidence those live checks have been executed. No production user, domain, database, financial or Auth-provider configuration was changed.
