# R01.3D.3H — Isolated Authenticated Staging HTTP Security Acceptance

**Status:** test automation and mock-based source tests prepared. **No real staging HTTP acceptance has been executed.** R00-D01, R00-D04 and R00-D09 remain pending owner decisions, and Vercel deployment previously failed with the build-rate-limit. An undeployed source change is not a live app acceptance.

## Why this is a separate milestone

The existing `check-stage-mfa-readonly.mjs` measures the real Supabase Auth AAL and verified TOTP factors for two reviewed disposable JWT identities. It does **not** verify whether the Next.js app and its business authorization rules deny support-case cross-tenant access, internal notes, Admin CSV, or privileged workspaces. Public desktop/mobile browser CI cannot supply this evidence either.

The new `scripts/release/check-stage-mfa-http-readonly.mjs` checks an **explicitly reviewed isolated staging app** through **GET-only**, no-follow HTTPS requests. It validates the stage/production project reference separation, Auth host, separately approved app staging origin, disabled payments/payouts/public signup, dedicated disposable session cookies and three distinct pre-seeded support records. It never stores or prints cookies or internal-note content, modifies application records, triggers login, approves an MFA decision, posts TOTP codes, performs financial transfers or calls the Auth admin API.

## Two isolated acceptance modes

**Baseline mode** (`STAGING_MFA_HTTP_MODE=baseline`) requires only existing staging authorization. It checks 13 GETs:
- Anonymous support case and support home are not readable.
- Buyer A can see their own support case but never the unique internal-staff note marker.
- Buyer B gets exactly HTTP 404 for Buyer A's support case.
- Buyer A gets exactly HTTP 404 for the Operations and Super Admin users' *own* support cases.
- Anonymous, Buyer A and Operations are blocked from the Super Admin CSV. Super Admin receives HTTP 200.
- Buyer A cannot open the Admin or Operations workspace; Operations cannot enter the Admin workspace.

**Enforced mode** (`STAGING_MFA_HTTP_MODE=enforced`) adds 12 GETs, but is **hard-blocked** while any required owner gate remains pending. It requires approved, fully recorded R00-D01/D04/D09 records and separate `STAGING_MFA_HTTP_ENFORCEMENT_APPROVED=true`. It does **not** set the application's `ADMIN_MFA_ENFORCEMENT_ENABLED`, `OPERATIONS_MFA_ENFORCEMENT_ENABLED` or recovery signoffs. An authorized reviewer must independently establish that the isolated staging deployment has the approved AAL2 enforcement enabled, and provide verified staff AAL1/AAL2 cookies:
- Operations and Super Admin AAL1 GETs to their privileged portals must redirect to the correct external step-up pages.
- Their separately authenticated AAL2 GETs must render the privileged portal (HTTP 200).
- Their AAL1 GETs to an **own** support-recovery case must remain accessible but show **no internal note**.
- AAL1 staff are refused (exact HTTP 404) for Buyer A's support case.
- AAL2 staff can access the staging buyer case and a deliberately seeded **internal-note marker** is visible.
- AAL1 Super Admin cannot GET the CSV (HTTP 403), whereas AAL2 Super Admin can (HTTP 200).

These are **test expectations**, not statements that a live staging deployment already meets them. Anonymous redirect is not mistaken for Authenticated 200. A client-supplied role label never substitutes for an actual session cookie.

## Required disposable fixtures and private staging environment variables

| Source | Environment input |
| --- | --- |
| **Manually reviewed protected staging environment variables** | `SMART_HUB_STAGE_SUPABASE_REF`, `SMART_HUB_PRODUCTION_SUPABASE_REF`, `SMART_HUB_STAGING_SUPABASE_URL`, `SMART_HUB_STAGING_BASE_URL`, `SMART_HUB_STAGE_REVIEWED_ORIGIN`, `SMART_HUB_PRODUCTION_BASE_URL` |
| **Three separate staging-only support records** | `STAGING_BUYER_A_SUPPORT_CASE_ID`, `STAGING_OPERATIONS_OWN_SUPPORT_CASE_ID`, `STAGING_SUPER_ADMIN_OWN_SUPPORT_CASE_ID` |
| **Disposable authenticated session secrets** | `STAGING_SESSION_BUYER_A`, `STAGING_SESSION_BUYER_B`, `STAGING_SESSION_OPERATIONS`, `STAGING_SESSION_SUPER_ADMIN` |
| **Staging test-only internal note marker** | `STAGING_SUPPORT_INTERNAL_MARKER` (a unique 18–80-character letter/digit/underscore/hyphen string seeded as an actual internal note on the Buyer A test case) |
| **Enforced mode only** | `STAGING_SESSION_OPERATIONS_AAL1`, `STAGING_SESSION_OPERATIONS_AAL2`, `STAGING_SESSION_SUPER_ADMIN_AAL1`, `STAGING_SESSION_SUPER_ADMIN_AAL2`, `STAGING_MFA_HTTP_ENFORCEMENT_APPROVED=true` and approved R00 decisions |

The two buyers must be independently provisioned in distinct organizations, the Buyer A support record must have an actual internal-only staff note with the precise marker, and the staff users' own support cases must be independently verified as belonging to them. Cookies are **sensitive secret session credentials**; provide them only to protected GitHub Environment secrets and never in source, messages, screenshots or logs. For enforced mode, additionally confirm that each AAL1/AAL2 cookie truly corresponds to the stated user and assurance; use the separately secured Supabase provider probe to establish verified factors. The HTTP matrix alone cannot prove that a named cookie corresponds to a specific provider user.

## Manual invocation and source verification

The workflow `.github/workflows/staging-mfa-http-readonly.yml` uses `workflow_dispatch`, requires explicit isolated-staging confirmation, runs in the protected GitHub `staging` environment, and supports only `baseline` or `enforced` modes. It does **not** run on normal push/PR and has no automatic fallback to production or the public SmartHub site.

Local source tests `tests/r01-3d3h-staging-http-security.test.mjs` use an in-memory HTTP response simulation; they test stage target rejection, anonymous/cross-role denial, missing internal note leakage protection, AAL1 AAL2 portal redirects, protected CSV, and GET-only requests. Mock results must **never** be reported as live staging acceptance.

This work does **not** change the prior seven-entry `r01-3d3g-mfa-acceptance-manifest.json`: all entries remain NOT_VERIFIED. A GitHub Actions run ID from an independently reviewed isolated staging workflow may become one piece of evidence only after humans check real role/tenant identities and the deployed SHA. Even green staged GET tests do not prove Auth provider sign-out/JWT revocation, real TOTP challenge failure/rate-limiting, two-officer recovery, or the 96-route security inventory.

## Release blockers and next task

- R00-D01/D04/D09 governance: **pending**.
- Isolated Auth test users, seeded disposable support data and staging deployment: **not verified**, and the manual test is **not executed**.
- Vercel deployment of latest main: **not confirmed**, previous build-rate-limit errors.
- Signed-in staging browser and provider outage tests, time-bound JWT/session revocation, audited two-officer recovery: **not complete**.
- Next R01.3D.3I should focus on **actual owner decisions and an isolated staging deployment**, not speculative production MFA activation. Production must not be used to satisfy these tests. The security-recovery migration remains a disabled design draft.

**Never activate mandatory MFA or factor removal based solely on this source matrix, mocked tests, public-browser acceptance or a filled-in evidence manifest.**
