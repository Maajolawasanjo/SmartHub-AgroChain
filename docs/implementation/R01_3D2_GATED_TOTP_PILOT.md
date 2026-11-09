# R01.3D.2 — Approval-Gated Authenticator Enrollment and Step-Up Pilot

**Status:** Source implementation and CI under review. **The pilot is DISABLED by default and cannot be enabled by an environment variable alone.** No mandatory privileged MFA, Super Admin duty split, financial approval authority or emergency recovery policy is activated.

## Source-of-truth requirements

- Private *SmartHub AgroChain Admin Dashboard Web Implementation*, Team & Access cross-module integration and access governance: privileged staff MFA, server-enforced restrictions, proper staff/Auth identity separation and audit.
- Private *SmartHub AgroChain Admin Dashboard Master Requirements & Implementation Traceability Register*, Team & Access addendum 91635: two separately designated Super Admin accounts, mandatory privileged MFA at launch, phased MFA for other staff, independent finance authority, and two-person recovery where feasible.
- Protected 102-row requirement workbook remains unavailable for writeback. Detailed owner decisions R00-D01/D04/D09 still show `PENDING_OWNER_DECISION` in `docs/implementation/r00-gates.json`.

## Reviewed Supabase provider methods

Current Supabase JavaScript Auth APIs were checked in provider documentation:

- `mfa.enroll({factorType:"totp"})` returns an unverified factor and one-time authenticator setup secret.
- `mfa.listFactors()` returns factors associated with the signed-in identity.
- `mfa.challengeAndVerify({factorId,code})` challenges and verifies a submitted six-digit authenticator code, promoting an eligible session to AAL2.
- `mfa.getAuthenticatorAssuranceLevel()` distinguishes AAL1 from AAL2.
- `mfa.unenroll({factorId})` may remove an unverified enrollment; this pilot intentionally does **not** allow removing verified factors.

Provider references: https://supabase.com/docs/guides/auth/auth-mfa, https://supabase.com/docs/reference/javascript/auth-mfa-enroll, https://supabase.com/docs/reference/javascript/auth-mfa-challengeandverify.

## Implemented

1. `src/server/admin/privileged-mfa-pilot.ts` provides the server-side activation gate and verified factor ownership matcher. **Both** must be true for mutations:
   - the R00-D04 owner decision record must explicitly read APPROVED with a decision reference, approver and approval date in source-controlled `r00-gates.json`;
   - `ADMIN_MFA_PILOT_ENABLED=true` must be explicitly set in the server environment.

   Both conditions are unfulfilled at this checkpoint. Merely deploying or setting the environment flag leaves the pilot disabled.

2. `src/app/api/admin/security/mfa/[action]/route.ts`: four POST-only Auth flows, each protected by canonical same-origin validation, configured backend, verified Supabase user, active authoritative `SUPER_ADMIN` account and the gate:
   - `enroll`: detached current-password verification, current factor-status verification, AAL2 for adding backup factors, and provider-created TOTP enrollment. Returns one-time setup secret *only* to the current browser with `Cache-Control: no-store`.
   - `verify-enrollment`: verifies that the selected factor belongs to the current identity and is `unverified`, then sends code to provider challenge-and-verify.
   - `step-up`: verifies that the factor belongs to the current identity and is `verified` before completing the provider challenge.
   - `cancel-pending`: requires password and an owned `unverified` factor; never removes verified factors. Intended for user-initiated recovery from an abandoned setup.

3. `src/app/admin/security/mfa/page.tsx` and `src/features/auth/components/privileged-mfa-pilot.tsx`: protected UI for manual setup key, initial verification, existing-factor challenge and pending-enrollment cancellation. A paused state is shown when the owner gate is absent; the page makes **zero MFA provider calls** when disabled.
4. `src/app/admin/settings/page.tsx`: link to protected pilot status.
5. `tests/r01-3d2-gated-mfa-pilot.test.mjs`: verifies disabled and approved simulated gate cases, factor ownership, role checks, CSRF boundary, server-only password confirmation, no permanent secret storage, and unchanged runtime Auth grants.

## Explicit safety limits and blockers

- **No MFA enforcement or privileged authorization change.** `requireSuperAdminPage`, `requireAdminApi`, standard login, finance and payment actions do not call this pilot and continue existing behavior. AAL2 challenge completion is **not** interpreted as a right to transfer money, change roles, or bypass approval chains.
- No new Supabase MFA provider configuration, Auth claims, JWT changes, public role, schema, migration, RLS policies, or privileged account is introduced.
- The UI shows a *manual setup key* rather than embedding untrusted SVG/QR content. It never stores the setup key in localStorage, logs or URLs. A refreshed page loses the key; the authorized user can remove a pending enrollment using current password.
- The provider may invalidate other sessions when an MFA factor becomes verified. The UI warns accordingly.
- A brute-force and rate-limit review is required before activation: while Supabase Auth enforces provider challenge rules, the application must independently validate request throttling, abuse detection and event logging in staging. This PR does not claim those are complete.
- The pilot does not implement verified-factor removal, lost-factor/two-person recovery, password-reset MFA recovery, mandatory AAL2 on every privileged API/page, step-up freshness for finance actions, session revocation, privileged audit retention, or two designated Super Admin authority. **These remain acceptance blockers under R00-D04 and R00-D09.**
- Provider integration tests with real test identities, rollout monitoring and backend Auth challenge configuration must pass before enabling the flag.
- Vercel deployment and production status must be independently verified. A passing public-page browser job alone does not test actual signed-in MFA enrollment.

## Verification

| Gate | Required evidence |
| --- | --- |
| Source tests | `npm test` including R01.3D.2 negative tests |
| Build | Prisma validate, TypeScript, Next.js build |
| Browser | Public desktop/mobile regression, plus dedicated *future* signed-in Auth flow test |
| Activation | R00-D04 approved + `ADMIN_MFA_PILOT_ENABLED=true` + staged Auth/MFA security acceptance |
| Operational readiness | MFA enforcement, recovery, per-actor audit, multi-Admin designations and finance segregation |
| Requirements matrix | Exact private workbook rows updated and owner-accepted; currently not done |

**Next controlled milestone:** after approved owner decisions, implement privileged AAL2 authorization at all Admin pages and APIs with safe enrollment/recovery fallbacks and audited revocation, then independent financial authority with maker/checker tests.
