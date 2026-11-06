# R01.3 — Existing Admin Capability Guard and Read-Only Access Review

**Status:** code implementation milestone, subject to source tests, Next.js build and CI. **Not** completion of expanded Admin permissions or release acceptance.

**Client source basis:** The uploaded Admin Dashboard Master Requirements & Implementation Traceability Register (Team & Access / Staff Directory / Individual Permissions / Records and Authorization) and detailed Admin Dashboard Web Implementation specification (Role, Scope, Actions). The detailed source package remains private and authoritative; this note only describes an incremental correction to the current codebase.

## Implemented safe changes

1. **Narrow Admin API capability boundary.** `src/server/admin/permissions.ts` now exposes a typed `AdminApiPermission` restricted to existing internal `operations.*`, `staff.*`, `permissions.*` and `platform.*` permissions. The server checks the value at runtime as well as at TypeScript compile time. `requireAdminApi` accepts only an ACTIVE, provider-email-verified `OPERATIONS` or `SUPER_ADMIN` account and an actual matching permission. This prevents accidentally passing a Buyer, Farmer or Field Agent-only permission string to a future `/api/admin` route.
2. **Current access review.** `/admin/access-review` is a new server-rendered, no-write, Super Admin-protected page. It reads only actual accounts, active Field Agent state scopes and unexpired invitations. The page shows role/status inventory, counts, search and filters, pagination and links to current staff records. It does not create or modify grants or user states.
3. **Real status caveats.** Current application role, active-status and state-scope information are not the same as provider-confirmed email/MFA or an independently approved financial authority. The page explicitly warns about these differences and does not present an ACTIVE account as an approved privileged actor.
4. **Navigation and traceability.** Access Review is linked only from Super Admin navigation, the Admin home and the existing permissions matrix. No other portal navigation is changed.

## Security and authorization invariants

- **No new account roles, permissions, individual grants, database migrations or financial approval rights** are introduced. The current fixed role permission matrix remains the only active access mapping.
- An Admin API must not authenticate successfully as a Buyer/Farmer/Field Agent solely because the caller passes a permission name belonging to another portal.
- Page authorization uses existing `requireSuperAdminPage()`, while API authorization remains server-derived and independent of client-side navigation.
- The current access review reads no Supabase secret, MFA enrollment, identity recovery token or bank details.
- All current privileges are still subject to verification, account status, record scope and the relevant service-side authorization. This milestone is deliberately not an authorization for new payment, finance, payout, refund or invitation behavior.

## Known unresolved requirements

- **R00-D01:** Separate new Admin project vs continued integrated project and ownership of authoritative business records. The uploaded master register specifies a new project built from the ground up. The historical reuse instructions conflict; explicit owner approval is still required.
- **R00-D04:** Eight departmental templates, individual grants/denies, two designated Super Admin accounts, mandatory privileged **MFA**, controlled recovery, audit and centrally enforced effective-permission policy. Not implemented by this milestone.
- **R00-D09:** Separation of financial authority from generic Super Admin. The existing finance action services still rely on the old approval model; no claim of compliance or production readiness is made here.

## Tests and release conditions

- `tests/r01-3-admin-access-review.test.mjs` executes the pure internal-permission predicate with positive and negative names; verifies that the server API guard checks identity status, internal role and matching permission.
- Source contract tests require new Admin page guards and API route auditing, and ensure the new access review is read-only, paginated and Super Admin-only.
- Standard CI must pass before merge.
- Real identity, session, MFA, privilege revocation, record-scope, deployment, data isolation and financial approval acceptance still require a configured environment and authorized test accounts. **Source CI passing is not a production release gate.**
