# R01.3D.3I — Verified Production Identity and Isolated Staging Access

**Observed November 9, 2026.** Source preflight and audit only. This milestone **does not create a Supabase project, start a Vercel deployment, approve governance, alter database tables, provision a user, mutate Auth, or enable MFA**.

## Verified infrastructure facts

- GitHub main prior to this phase: `3a322da3176cd54f48bc83691eb893950484c9a9`; R01.3D.3H was merged with all source and public-browser CI checks green. **This is not production deployment evidence.**
- SmartHub's existing production-intended Supabase ref is `ematieqwxoiwoovmqdba`, named **TAIMAKO Care** in the connected **nathan** account. This matches the earlier `docs/deployment/LIVE_SUPABASE_STATUS_2026_11_05.md`. Live read-only project/schema inventory shows it ACTIVE_HEALTHY, 73 application tables plus the Prisma migration ledger in `public`, and SmartHub-named migration records. This is the **existing main backend**, not a disposable test environment.
- The same connected Supabase account listed **no development branches and no separate SmartHub staging project**. This does not exclude a staging project under a different, unconnected account.
- The Vercel app connector currently lists **Abiodun Lateef's projects** (`abiodun-lateefs-projects`) and no SmartHub projects. The GitHub deployment status checks for this repository instead link to the **Ma'ajo Lawasanjo** team, `maajo-lawasanjos-projects`, with two project contexts: `smarthub-agrochain` and `smarthub-agrochain-v2`.
- Both GitHub Vercel commit statuses are **failure**, with the build-rate-limit link. No current deployment SHA, live preview or logs from either target project can be verified using the presently connected Vercel team.

## Concrete safety fix

Previously, the existing staging scripts accepted ANY syntactically valid `SMART_HUB_PRODUCTION_SUPABASE_REF` provided by the runtime, as long as it differed from `SMART_HUB_STAGE_SUPABASE_REF`. In a misconfigured secret environment, someone could claim a fake production ref and accidentally point a "staging" read/test or migration at the **actual** SmartHub main database.

The new, nonsecret `docs/implementation/r01-3d3i-environment-boundary.json` binds the reviewed production reference to the prior GitHub baseline and live Supabase project inventory.

`scripts/release/reviewed-environment-boundary.mjs` enforces:
1. The environment-declared **production** ref must exactly equal reviewed `ematieqwxoiwoovmqdba`.
2. The candidate **staging** ref must be a different, valid Supabase project ref.
3. A fake production ref or actual main database as stage causes a failure **before any stage DB connection or Auth/HTTP request**.

All three entrypoints now call this same check: `stage-target.mjs` for protected database work; `check-stage-mfa-readonly.mjs` for the read-only provider assurance test; and `check-stage-mfa-http-readonly.mjs` for role/record HTTP acceptance. Tests use **public nonsecret IDs** only; no production passwords or tokens are committed. A formal future migration to a different production Supabase project must first update and independently review this registry.

This is defense-in-depth, not a substitute for verifying staging ownership, reviewing the protected CI environment, managing migration approvals, and inspecting Vercel release settings. A malicious contributor with merge access could change the registry, which is why code review and protected branches are still necessary.

## Current blocker register

| Dependency | Observed status | Next authorized step |
| --- | --- | --- |
| Production Supabase identity | VERIFIED, existing main DB | Keep it isolated from disposable test activity |
| Separate staging Supabase project or branch | NOT FOUND in connected account | Owner must choose target account/org, review cost and explicitly approve isolated creation, then record the stage ref |
| Existing SmartHub Vercel team access | NOT GRANTED to current Vercel connector | Authorize `maajo-lawasanjos-projects` through Vercel team consent or connect the correct Vercel account |
| Vercel build-rate-limit | Two failed GitHub project contexts | Review plan/limit in actual team, avoid repeated pushes, resolve quota or choose an approved hosting route |
| Protected staging origin | NOT VERIFIED | Configure explicit staging/preview domain and origin, ensure it is not production |
| Disposable Auth accounts/cookies | NOT PROVISIONED | Only after isolated stage exists: seed independent BUYER/FARMER/OPERATIONS/SUPER_ADMIN users and support test records |
| Owner decisions R00-D01, D04, D09 | PENDING_OWNER_DECISION | Obtain signed decisions with independent identity/security/finance reviewers |
| Real MFA/HTTP provider acceptance | NOT RUN | Execute reviewed staging workflows after environment and fixtures are ready |
| Session revocation/recovery | NOT EXECUTABLE | Review private ledger, two-officer procedure and Auth token expiry; do not reset live factors |

## Next operator actions

**1 — Vercel team access.** Use ChatGPT's Vercel connection authorization for `maajo-lawasanjos-projects` (or have an eligible team member grant access through the correct Vercel account). Verify exact project IDs, Git repository mapping, current team build quota and whether both similarly named projects are necessary. Do **not** delete or disconnect a project to solve limits without verifying ownership, active domain and rollback path.

**2 — Decide isolated Supabase ownership and budget.** The existing TAIMAKO Care database must **not** be repurposed as staging. Choose a separate Supabase organization/project or separately priced branch. Quote and approve any creation/compute cost before using the connected Supabase create project/branch capability. Prefer an independent project for destructive integration, reset/recovery and session tests. Never copy live secrets or customer data into isolated staging.

**3 — Configure staging infrastructure.** Link reviewed staging project and Git preview origin; set stage-only public URL/key, dedicated server credentials, TLS database URLs, backup/restore evidence and private evidence buckets. Configure GitHub protected `staging` environment. Keep `PAYMENTS_ENABLED=false`, `PUBLIC_SIGNUP_ENABLED=false`, `SUPPLIER_PAYOUTS_ENABLED=false`, and mandatory MFA/recovery flags disabled. Do not add variables to `NEXT_PUBLIC_` except the safe public Supabase URL/key.

**4 — Run preflight, then acceptance.** First the read-only staging-target and migration history inspections. Only after approvals and separately reviewed backup evidence may migrations be applied to staging. Then run five-role staging HTTP/browser acceptance and the separately opted-in Auth AAL1/AAL2 read-only workflow. Keep the seven MFA acceptance manifest checks `NOT_VERIFIED` until real evidence exists.

**5 — Production release.** Verify Vercel actually deployed the intended Git SHA and that runtime envs point to the production target; apply real-role, financial maker/checker and support tests before owner signoff. Never equate a green GitHub PR with a deployed production release.

## Safety and limits

- This PR does **not** bypass Vercel's build-rate-limit. The matching Vercel team needs explicit connection/authorization.
- There is no verified isolated staging account yet in the accessible Supabase account. No new billed resources were provisioned.
- No decision in `r00-gates.json` is changed. Mandatory MFA and recovery-factor removal remain gated off.
- No Prisma migrations, data writes, Auth user updates, signed URL requests or payment operations were performed as part of this milestone.
- Source test success is offline only; exact staging origin and real provider acceptance remain independently blocked.

**Next R01.3D.3J** should start only after the correct Vercel workspace is connected and the owner chooses an explicitly approved isolated Supabase staging project, so the next significant implementation can use **real live staging acceptance** instead of further hypothetical checks.
