# R01.3D.3G — Isolated Staging MFA Evidence and Operational Release Gate

**Status on November 9, 2026:** source-only; no real staging user/provider acceptance test has been run, no factor, account, database or production environment was modified. R00-D01/D04/D09 are still `PENDING_OWNER_DECISION`. Both previous Vercel projects have reported **build-rate-limit** failures; a GitHub merge alone does not verify any production deployment.

## Security gap and source correction

Previous R01.3D.3E added a read-only staged test that called `auth.getUser(jwt)` and `auth.mfa.getAuthenticatorAssuranceLevel(jwt)` on two disposable sessions and checked only `currentLevel`. That was not a sufficient **TOTP-specific** acceptance: a valid AAL2 JWT can represent another MFA mechanism, a stale factor state can have `currentLevel=aal2` with `nextLevel=aal1`, and a test token might belong to a different staging identity than the one approved for the run.

### Improved source test harness

`scripts/release/check-stage-mfa-readonly.mjs` now requires both test JWTs to match separately reviewed, distinct Supabase Auth UUIDs provided as protected staging secrets `STAGING_MFA_AAL1_EXPECTED_USER_ID` and `STAGING_MFA_AAL2_EXPECTED_USER_ID`. It validates the account from **the staging Auth server** using `getUser(jwt)` and rejects anonymous/unconfirmed users. For both identities it also checks that their **server-returned Auth user** has a verified `totp` factor, not an arbitrary client metadata claim. It then validates provider-reported assurance and authentication methods:

| Disposable staging identity | Expected provider evidence |
| --- | --- |
| AAL1 enrolled-but-unchallenged | `currentLevel=aal1`, `nextLevel=aal2`, verified TOTP on the same Auth user, no TOTP AMR for current session |
| AAL2 successfully challenged | `currentLevel=aal2`, `nextLevel=aal2`, verified TOTP on the same Auth user, current authentication methods include `totp` or `mfa/totp` |
| Unknown, expired, unconfirmed, wrong-account, provider unavailable, stale factor, wrong AMR | **Reject** without logging user identities, session tokens, factors or provider payloads |

The probe remains **read-only** and never creates a session, calls a second-factor challenge, enrolls or unenrolls a factor, or modifies database records. It verifies user/factor state and session assurance; it does not exercise *how* the challenge was completed or prove that app routes are enforcing MFA.

### Stage workflow changes

The manual-only `.github/workflows/staging-mfa-readonly.yml` now additionally references `STAGING_MFA_AAL1_EXPECTED_USER_ID` and `STAGING_MFA_AAL2_EXPECTED_USER_ID` as **protected staging environment secrets**. The existing isolation confirmation remains necessary. An independent operator must provide two disposable, email-confirmed Auth users; **both should have an enrolled verified TOTP**, with one fresh **AAL1** session that has not challenged it and one **AAL2** session that completed the challenge. The token/session must remain valid during the manual run. Never paste JWTs, TOTP setup secrets or recovery codes into chat, issues, CI logs or source control.

The workflow must NOT be triggered with production accounts or production Auth keys. The read-only target is strictly compared with a separately reviewed production project ref and payments/payouts must be disabled.

## Explicit, non-authorizing evidence index

- `docs/implementation/r01-3d3g-mfa-acceptance-manifest.json` holds **seven NOT_VERIFIED** evidence checks, without any secrets or automatic release authority:
  1. Real staging AAL1/AAL2 TOTP provider observation
  2. Authenticated cross-role support HTTP/owner/internal note isolation
  3. Privileged Admin/Operations/finance API negative matrix
  4. Independent two-officer lost-factor staging exercise
  5. Provider revocation and JWT lifetime evidence
  6. Reviewed private audit-ledger recovery design
  7. Verified deployed production SHA / approval
- `scripts/release/report-mfa-acceptance.mjs` reads the separate owner-decision file plus the evidence index and prints a **non-authorizing, offline** blocker report. `node scripts/release/report-mfa-acceptance.mjs` is informational; `--require-complete` exits nonzero while blockers remain. It never enables a feature, changes Supabase Auth, grants finance authority, executes SQL, or verifies that an evidence reference is authentic. Even if the manifest is manually filled with complete references, its only positive state is **EVIDENCE_REFERENCES_PRESENT_REQUIRES_INDEPENDENT_REVIEW**, and `authorizesEnforcement`, `authorizesRecovery`, `authorizesProductionDeploy` remain `false`. Independent governance is required.
- Negative tests cover wrong staging user, unverified or missing TOTP, wrong AAL, missing TOTP AMR, stale `nextLevel`, anonymous or unconfirmed accounts, provider errors, malformed release decisions and spoofed manifest authorizations.

## Session revocation is NOT the same as instant JWT invalidation

Supabase refresh-session revocation/sign-out does not necessarily invalidate already-issued access JWTs immediately. Before live recovery, the approved design must confirm the effective access-token expiry and any required server-side session ID checks. A live staging exercise must record the exact observed behavior for refresh token revocation, outstanding access tokens, short session expiration and staff role suspension. This report makes no false claim of instant JWT invalidation.

## Supabase experimental recovery codes: a newly verified design option, NOT enabled

Supabase JavaScript SDK 2.116.0 introduced an **experimental** `auth.mfa.recoveryCodes` API, so the pinned `@supabase/supabase-js@2.118.0` may expose `generate`, `verify`, `regenerate` and `unenroll` when `auth.experimental.recoveryCodes: true` is set. The general MFA overview still says recovery codes are unsupported; this discrepancy means actual hosted Supabase Auth support **must be verified in a disposable staging environment before architecture approval**. No experimental flag or recovery-code endpoints are enabled by this PR. Recovery codes (stored securely and single-use) address a user's own recovery; they do **not** on their own satisfy the private client's two-independent-officer privileged administrative reset and identity-verification requirements.

Official vendor references checked November 9 2026:
- https://supabase.com/docs/reference/javascript/auth-mfa-getauthenticatorassurancelevel (JWT-specific AAL and authentication methods)
- https://supabase.com/docs/reference/javascript/auth-getuser (network-verified user identity)
- https://supabase.com/docs/reference/javascript/auth-mfa-recovery-codes-generate (experimental opt-in)
- https://supabase.com/docs/reference/javascript/auth-mfa-recovery-codes-verify (single-use AAL2 elevation)
- https://github.com/supabase/supabase-js/blob/master/packages/core/supabase-js/CHANGELOG.md (release 2.116.0 and 2.118.0)

## Operational approval blockers

| Control | Actual status |
| --- | --- |
| R00-D01 Admin identity ownership | PENDING |
| R00-D04 MFA and two-officer recovery decision | PENDING |
| R00-D09 independent financial authority | PENDING |
| Real AAL1/AAL2 Auth verification against isolated Supabase | NOT EXECUTED |
| In-app cross-role authenticated MFA and support API acceptance | NOT EXECUTED |
| Two-officer recovery migration, Auth provider change, session revocation | NOT IMPLEMENTED / NOT TESTED |
| Vercel production deployment | NOT VERIFIED, known build-rate-limit errors |
| Source tests, Prisma/TypeScript/Next build and public browser | GitHub CI required before merge |

## What happens next

Once a separately approved **isolated staging** Auth project and the two disposable test accounts are ready, an authorized operator can run the manual staging workflow and attach its run ID to the evidence register only after separately reviewing actual provider responses. Live production or existing user accounts must never be used as substitutes. The next R01.3D.3H can add safe authenticated staging HTTP negative-case checks, but only after isolated cookies and target origin are confirmed and no migrations or financial actions are required.

**Never enable `ADMIN_MFA_ENFORCEMENT_ENABLED`, `OPERATIONS_MFA_ENFORCEMENT_ENABLED` or any provider recovery mutation based solely on these static tests, a submitted manifest, or a passing public-site browser CI build.**
