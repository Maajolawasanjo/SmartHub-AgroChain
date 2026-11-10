# Phase 19 — V2 deployment recovery and release provenance

**Status:** source implementation and read-only evidence, **NOT** a verified Vercel release or domain migration.

## Verified topology (owner Vercel dashboard, 10 November 2026)

| Vercel project | GitHub source | Project URL / domain role |
| --- | --- | --- |
| `smarthub-agronexus` | `Maajolawasanjo/smarthub-agronexus` | Existing `www.smarthubagrochain.online`; retain as the old live/rollback project |
| `smarthub-agrochain` | `Maajolawasanjo/SmartHub-AgroChain` | `smarthub-agrochain-eight.vercel.app`; duplicate-new-code project, do not delete blindly |
| **`smarthub-agrochain-v2`** | **`Maajolawasanjo/SmartHub-AgroChain`** | **`smarthub-agrochain-v2.vercel.app`**; owner-selected redesigned destination |

The GitHub `main` branch is the authoritative redesigned source. Do not push new code into `smarthub-agronexus`, assign the `.online` domain, remove a Vercel project, enable payments, mutate the existing Supabase database, or activate privileged MFA as part of Phase 19.

Two Vercel projects currently attempt to deploy the same new GitHub source. Vercel bot email confirms the **exact daily cap** `api-deployments-free-per-day` (more than 100) on 9 November. Avoid repeated unnecessary Vercel attempts; once authorized, preserve only the desired V2 auto-deploy and disable unwanted duplicate builds in **that other Vercel project's settings** after owner review.

## Deployed code proof (new in Phase 19)

A **public, secret-free** `GET /api/release/identity` endpoint returns these non-sensitive fields:
- application identifier
- actual GitHub repo identity from Vercel's system environment
- complete 40-character Git commit SHA from Vercel system environment
- source branch and Vercel environment

Responses have `Cache-Control: no-store` and `X-Robots-Tag: noindex`. It performs **no database or provider calls** and never returns credentials, DB identity, financial flags or user information. If the Vercel system Git variables are not available, fields are `null` and no verification can succeed.

The read-only `scripts/release/verify-v2-deployment.mjs` ONLY accepts the exact `https://smarthub-agrochain-v2.vercel.app` origin. It refuses the existing `.online` domain, old Agronexus repository, and duplicate `smarthub-agrochain-eight.vercel.app`. It insists on a reviewed 40-character main SHA and a `production` identity from Vercel. This prevents falsely describing an older or wrong-project build as the redesigned release.

After GitHub `main` is merged **and** a new successful V2 production deployment is actually observed:

```sh
npm run verify:v2-deployment -- --sha=<exact-40-character-merged-main-commit>
```

A failure means **not verified**, not proof the site is down. A Vercel password-protected preview, missing system Git variable, wrong branch or old code fails safely. Enable Vercel **Settings → Environment Variables → Automatically expose System Environment Variables** if the team has deliberately disabled them; this is a project-setting owner action, not a code substitute.

## Owner-only Vercel actions, exact order

1. Authorize the existing Ma'ajo Vercel team in the connected Vercel integration. The connected Vercel account currently gets HTTP **403** for `maajo-lawasanjos-projects` and cannot read the two new projects; do not invent deployment IDs or publish tokens.
2. Inspect **V2 Settings → Git**: GitHub repo `Maajolawasanjo/SmartHub-AgroChain`, production branch `main`, correct root directory `/`, Next.js preset, Node compatibility and source SHA.
3. Inspect **V2 Settings → Domains**: preserve V2's `.vercel.app` origin; do not move `www.smarthubagrochain.online` from `smarthub-agronexus` yet.
4. Inspect **V2 Settings → Environment Variables** using only **variable names and redacted validation**: exact reviewed main Supabase ref from `r01-3d3i-environment-boundary.json`, URL/key from that project, matching TLS runtime pooler and migration URL, explicit HTTPS `APP_BASE_URL` pointing at the correct V2-origin during early acceptance, secret recovery key. Keep `PAYMENTS_ENABLED=false`, `PAYSTACK_LIVE_ENABLED=false`, `SUPPLIER_PAYOUTS_ENABLED=false`, `PUBLIC_SIGNUP_ENABLED=false`, `RELEASE_ACCEPTANCE_ENABLED=false`. Do not copy secrets to GitHub, chat, screenshots or logs.
5. Inspect **other redesigned project** `smarthub-agrochain`: only after confirming no custom domains or separate users/required preview workflows depend on it, disable unwanted automatic deployments **in that project's settings**. Do not add repository-wide `vercel.json` deployment-disable rules: they would affect V2 as well.
6. Confirm Vercel **daily deployment cap has replenished** and initiate exactly one intended V2 `main` production deployment. Record actual successful Vercel deployment URL/ID, SHA, timestamp and review findings.
7. Run this Phase 19 identity check. Then validate live site routes, CSS/image assets, sign-in state, safe feature-disabled behavior, server-to-Supabase configuration, auth callback domain, read-only readiness and backup. Green GitHub Actions alone does **not** certify this.
8. A separately reviewed cutover moves `www.smarthubagrochain.online` and any apex domain from old Agronexus to V2 **only after release acceptance**, TLS/redirect checks and rollback approval. Preserve old project for rollback. Database and payment/MFA activation remain separate approved phases.

## Human sign-off and blockers

- [ ] Ma'ajo Vercel team access granted
- [ ] V2 Git/root/production branch and env names reviewed
- [ ] Daily cap reset; duplicate automatic builds resolved
- [ ] Successful production V2 deployment observed
- [ ] `verify:v2-deployment` passes at the deployed merge SHA
- [ ] Real runtime/auth/DB acceptance and customer-data protections pass
- [ ] Domain transfer and rollback explicitly approved

**No phase may be marked deployed from a source commit alone.** Related issue: [#65](https://github.com/Maajolawasanjo/SmartHub-AgroChain/issues/65).
