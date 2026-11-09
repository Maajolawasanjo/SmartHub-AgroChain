# R01.3D.3C — Operations MFA Pilot, Dormant AAL2 Boundaries and Privileged Route Inventory

**Status:** source implementation only. No live mandatory MFA, no Operations Auth factor enrollment performed, no Supabase schema/role change, and no privileged or financial authority granted. Owner decisions R00-D01/D04/D09 remain `PENDING_OWNER_DECISION`.

## Requirements and audit basis

- Private client SmartHub Admin Dashboard Web Implementation, Team & Access and Individual Permissions: distinct staff identity and Supabase Auth identity, privileged MFA, documented individual scope and restrictions, independent authority for sensitive actions and auditable recovery.
- Private Master Requirements & Traceability Register, Team & Access addendum: two designated Super Admin responsibilities, mandatory privileged MFA at launch, phased staff MFA and independent financial maker/checker.
- Existing R01.3D.2 Super Admin TOTP pilot and R01.3D.3A/B dormant Super Admin AAL2 checks and independently reviewed sensitive financial services.
- Supabase documentation: https://supabase.com/docs/guides/auth/auth-mfa and https://supabase.com/docs/reference/javascript/auth-mfa-getauthenticatorassurancelevel (server provider/session AAL1 vs AAL2). MFA factor enrollment creates unverified records and challenge verification promotes sessions. Provider recovery codes are not a substitute for approved two-person lost-factor recovery.
- The protected private 102-requirements workbook was not editable in this session. Do not mark rows complete or invent requirement IDs.

## Implemented

1. **Separately gated Operations MFA policy** — `src/server/operations/mfa-policy.ts`. The Operations *enrollment pilot* requires **recorded APPROVED** R00-D01 and R00-D04 decisions (each with approver/reference/date) plus `OPERATIONS_MFA_PILOT_ENABLED=true`. The **enforcement policy** additionally requires the existing privileged rollout signoffs/R00-D09, plus `OPERATIONS_MFA_ENFORCEMENT_ENABLED=true`, `OPERATIONS_MFA_ALL_ENTRYPOINTS_SIGNOFF=true`, `OPERATIONS_MFA_RECOVERY_SIGNOFF=true`, and `OPERATIONS_MFA_ENROLLMENT_VERIFIED=true`. **None of these flags or owner gates were changed by this PR.** A single environment flag cannot activate it.
2. **Authentication, setup and challenge** — new `POST /api/account/security/operations-mfa/[action]` and `/account/security/operations-mfa`:
   - verifies same origin, signed-in current Supabase user, active authoritative OPERATIONS account, confirmed email and approved pilot gate;
   - `enroll` requires current password, blocks duplicate unverified TOTP and demands AAL2 before adding a backup factor;
   - `verify-enrollment` and `step-up` require an exact factor already listed by Supabase Auth for the current user with matching verified/unverified state;
   - `cancel-pending` requires current password and can remove **only an owned unverified** factor;
   - short-lived TOTP setup secret returned in an authenticated no-store response and stored only in component memory; no localStorage, provider secret logging, or enabled admin-service token.
3. **AAL1-accessible step-up** — the Operations MFA UI sits *outside* the `/operations` layout to avoid enforcing AAL2 before the user can complete the second-factor challenge. It cannot grant any role or approve finances. Navigation links to the status/pilot page.
4. **Server-side Operations scope** — `src/app/operations/layout.tsx` protects every nested Operations page with current DB role/status and verified Supabase email; after signed rollout it checks AAL2 + verified TOTP for Operations and separately for Super Admin users entering Operations. `requireActor("OPERATIONS")` now adds the dormant Operations check for Operations users and the existing Super Admin MFA check for Super Admin users after the existing role/capability and provider identity validation. `requireAdminApi` now also applies the approved Operations factor check when an Operations role calls an Admin API.
5. **Sensitive account actions** — `POST /api/account/[action]` adds the dormant factor check for `password`, `email`, and `phone` actions when the account is Operations or Super Admin. The existing current-password reauthentication, Auth user update and audit events remain. **Intentionally exempt:** sign out, separate password-recovery links, `revoke-others` (defensive session revocation), deletion-request review and deletion cancellation. Real emergency recovery and session revocation remain separate operations and must not be blocked in a lost-factor loop.
6. **Source route inventory** — `docs/implementation/r01-3d3c-privileged-route-inventory.json` enumerates every currently present `route.ts` under `/api/admin`, `/api/operations`, `/api/account`, and `/api/auth`. It **does not** claim each delegated handler has been independently integration-tested. Source tests fail if a new route appears without classification. Provider webhooks, farmer/buyer, field-agent, support and callbacks are **outside this inventory** and require separate reviews before global endpoint signoff.
7. **Automated negative tests** — `tests/r01-3d3c-operations-mfa-and-inventory.test.mjs` tests pending decisions, independent toggles, AAL2 denial, identity/status/email failures, separated AAL1 challenge route, Auth factor ownership, existing permission precedence, preservation of account recovery/session revocation, and exact route enumeration.

## Critical implementation boundaries

- Neither the Operations pilot nor mandatory AAL2 can activate under the existing pending decision records. This PR does not change R00 gate statuses, release flags, live Supabase provider settings, database tables, security grants, privileged roles or financial maker/checker restrictions.
- All current AAL2 checks only supplement **existing role and scope authorization**. They cannot grant extra access. A real signed-in user session and current authoritative account are checked before factors.
- The Operations portal's shared `requirePortal` still checks current role, status and verification. The new layout gives defense in depth for future nested pages, but does **not** replace record-level service authorization.
- Current `SUPER_ADMIN` policies still require R00-D04 and R00-D09, two designated officers, independent authority, and a tested two-person recovery path. Current Operations rollout is a separate phase, not implied by Super Admin enrollment.
- The Operations pilot's action handler deliberately follows the existing Super Admin pilot contract; future work should extract a common audited TOTP service to eliminate drift and run real provider tests before toggling any release flags.
- HTTP route inventory is a **source inventory only**: middleware, server actions, payment callbacks, service-to-service access, provider webhooks, signed URLs and non-Operations endpoints must be separately audited. The `ADMIN_MFA_ALL_ENTRYPOINTS_SIGNOFF` and `OPERATIONS_MFA_ALL_ENTRYPOINTS_SIGNOFF` flags must **not** be set based on inventory alone.
- Mobile/desktop *public-page* browser checks do not validate authenticated MFA enrollment, challenge failure/rate limiting, session revocation, AAL2 after refresh, two-factor removal, lost phone recovery, independent approvers, or provider outages.

## Release and acceptance checklist

| Criterion | State at merge candidate |
| --- | --- |
| Source tests, Prisma generate/validate, TypeScript, Next production build | CI required |
| Desktop/mobile public browser regression | CI required |
| Operations AAL1->TOTP verification->AAL2 real provider integration | **NOT DONE** |
| Two independent designated Super Admins and Ops recovery officers | **NOT APPROVED** |
| Complete cross-domain API/middleware and finance-provider inventory | **INCOMPLETE** |
| R00-D01, D04, D09 owner decisions | **PENDING** |
| Database migrations/financial privileges changed | **NONE** |
| Vercel deployment and authenticated production acceptance | **NOT CERTIFIED** |

**Next R01.3D.3D:** audit non-Operations service and cross-portal privileged entry points; test actual Supabase MFA with isolated test users and provider configuration; implement two-person lost-factor recovery with durable audit, session revocation and approved identity checks; record owner approvals; only then activate MFA and run production acceptance.
