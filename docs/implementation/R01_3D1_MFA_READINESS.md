# R01.3D.1 — Privileged MFA and Super Admin Governance Readiness

**Status:** Read-only source implementation; production acceptance NOT established. This milestone does not activate mandatory MFA, add factor-enrollment interfaces, create designated Super Admin identities, or authorize privileged operations.

## Exact requirement trace

- Private source: *SMARTHUB AGROCHAIN LTD — ADMIN DASHBOARD WEB IMPLEMENTATION*, Team & Access — Cross-Module Integration addendum (around pp. 1243–1251). Authentication identity, staff identity, standard access role and individual exceptions are distinct. Privileged accounts require MFA; staff access depends on approved governance, not title.
- Private source: *SMARTHUB AGROCHAIN ADMIN DASHBOARD MASTER REQUIREMENTS & IMPLEMENTATION TRACEABILITY REGISTER*, Team & Access addendum 91635 (p. 8). Requires two designated Super Admin accounts with separate responsibilities, mandatory MFA for privileged users at launch, phased MFA for other staff, no automatic financial authority from Super Admin access and two-person recovery where possible.
- Protected 102-requirement workbook: exact row IDs and acceptance cells are still unavailable, so do not mark anything as complete.

## Existing stack audit

- Supabase Auth establishes verified identity via `auth.getUser()` in `src/server/auth/context.ts`.
- `src/server/admin/layout.tsx` and `requireSuperAdminPage` require active account, verified provider email and current fixed `SUPER_ADMIN` role.
- `requireAdminApi` checks the current role/capability matrix; it does NOT enforce Supabase AAL2.
- `src/server/auth/reauth.ts` verifies a current password with a detached client on sensitive account changes; **password reauthentication alone does not prove a second MFA factor**.
- Staff recovery and existing `AccountRole` continue unchanged. Two designated Super Admin positions are not represented by distinct approved duty assignments in the current schema.

## Changes in this PR

1. `src/server/admin/privileged-mfa-readiness.ts` asks the signed-in Supabase user client for the current session's `auth.mfa.getAuthenticatorAssuranceLevel()` and `auth.mfa.listFactors()`, using the current provider API. The result contains **only** AAL1/AAL2/unknown, a count of provider-verified factors (or null), and a cautious observation outcome.
2. Provider errors, missing session levels, or factor lookup failures produce `UNKNOWN`, never a false success. A session is reported as second-factor-observed only when AAL2 **and** at least one verified factor are both visible. Factor IDs, secrets, phone numbers, QR codes, raw errors, access tokens and user IDs are never surfaced.
3. `src/app/admin/settings/page.tsx` displays a read-only privileged identity readiness panel, protected by the existing server-side Super Admin layout and page guard. It shows the **current** active `SUPER_ADMIN` account count from the authoritative DB, but carefully notes that the count does not establish designated roles, independence, approved governance or two-person recovery.
4. Automated tests execute the real read-helper with simulated provider responses: AAL2 with verified factor, AAL1 with verified factor, AAL2 without factors, provider error, missing levels, thrown errors, output secrecy, unchanged security gates and no active MFA privileges.

## What this is NOT

- This result is **not used for permission decisions**. No guard, API, finance service or user onboarding flow imports this readiness result for access enforcement.
- Enrollment, verification, challenge, revocation and recovery endpoints **are not introduced**. There are no new Auth writes.
- An AAL2 snapshot does not replace live verification on a sensitive action, independent approver checks or immediate token/session revocation.
- Two active `SUPER_ADMIN` accounts is not proof they have approved separate designated duties. There is no automatic financial authority.
- No Prisma migration, database table, new account role, grant, RLS policy, session policy, payment flag or provider configuration is changed.
- The main Auth service must enable MFA challenges before deployment-time AAL2 enforcement could work. This PR neither changes the Supabase dashboard nor assumes settings are enabled.
- Real provider response tests, account enrollment paths and staged login/challenge/browser acceptance are **not** performed by source-only unit tests or public-page browser checks.

## Remaining governance approvals and acceptance

`docs/implementation/r00-gates.json` still lists:

- **R00-D01 — PENDING_OWNER_DECISION:** Separate vs integrated Admin deployment, authoritative identity and Auth configuration.
- **R00-D04 — PENDING_OWNER_DECISION:** Approved privileged role eligibility, mandatory MFA enforcement boundaries, enrollment/challenge and recovery workflow, two designated Super Admin responsibilities, two-person recovery, session revocation and exception authority.
- **R00-D09 — PENDING_OWNER_DECISION:** Independent financial maker/checker authority, refund/payable/transfer approvals, and no automatic finance power from Super Admin identity.

**CI acceptance for this source milestone:** `npm test`, Prisma generation/validation, TypeScript, Next.js production build and desktop/mobile public browser checks. **Not a production security acceptance:** signed-in role-specific provider MFA tests with test identities, Super Admin recovery exercise, cross-role negative tests, release checks and Vercel deployment verification.

## Next safe increment after R00-D04

Design a provider-native TOTP enrollment and challenge experience, confirm factor verification on the server, and implement step-up or mandatory AAL2 checks at **all** privileged API and page boundaries under an approved rollout and recovery strategy. Require separate Super Admin duty designation and independent approval before allowing access-governance or financial decisions.
