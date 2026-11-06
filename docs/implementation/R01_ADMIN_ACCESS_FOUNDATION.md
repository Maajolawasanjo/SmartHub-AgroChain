# R01 — Admin Access Foundation and Architecture Decision Boundary

**Status:** Safe security baseline implemented; **expanded Admin architecture and business-policy implementation remain blocked pending client decisions.**
**Source:** uploaded Admin Dashboard Master Requirements & Implementation Traceability Register, detailed Admin Dashboard Web Implementation specification, and R00 decision protocol. The client source files and confidential source excerpts are kept outside this public repository.

## Why this milestone is narrow

The newer Admin master register describes a **new project built from the ground up** and says it is not an instruction to reuse old application routes, schema or components. Other historical implementation instructions advise reusing existing authenticated modules. No architecture decision has been recorded in `r00-gates.json`.

This milestone does **not** select either architecture. It makes the existing application harder to accidentally expose while the client approves the target arrangement. It must not be described as delivery of the new Admin Portal.

## Implemented access corrections

1. **Shared route boundary:** `src/app/admin/layout.tsx` now invokes the existing server-derived `requireSuperAdminPage()` for all nested pages. It checks provider-verified email, active account status and authoritative DB role. This is defense in depth, **not a substitute for page, API or record guards**.
2. **Consistent privileged queue shell:** Quotation Approval, Refund Review and Supplier Payout Governance now call the same `requireSuperAdminPage()` used by other Admin screens, and render the Admin navigation rather than an Operations sidebar. They retain existing review data, routing and action-service delegation.
3. **Truthful permissions presentation:** `/admin/permissions` distinguishes *current fixed templates* from the requested final departmental role and individual-permission model. The current role table remains restricted to allowed server roles; no provisional override storage or browser-selected permissions have been added.
4. **Route-inventory regression test:** `tests/r01-admin-access-foundation.test.mjs` enumerates all Admin pages and API endpoints. Newly introduced Admin API endpoints fail source testing until explicitly reviewed, classified and added to the guard inventory. Known delegated actions are checked against their real service authorization guard.

## Module architecture and authority gaps not yet implemented

| Requirement class | Current code evidence | Remaining work |
|---|---|---|
| One authoritative Admin security system | `src/server/admin/guard.ts`, `permissions.ts`, `/admin` and `/operations` | Decide separate Admin project vs in-app architecture and service access strategy |
| Approved department roles | Currently `FIELD_AGENT`, `OPERATIONS`, `SUPER_ADMIN` plus external Buyer/Farmer accounts | Approved Sourcing, Fulfilment/Logistics, Finance, Support/Communications and Content Editor templates and constraints |
| Individual grants / denies | Current fixed role-to-permission table only | Centrally enforced per-user overrides, effective-permission evaluator, owner approval, audit and tests |
| Two designated Super Admin accounts | Current generic account role | Approved account governance, separation of responsibilities, recovery and documented revocation |
| Privileged MFA | Current auth context requires provider email verification, not independently proven MFA | MFA solution, proof of AAL, recovery and rollout; **not** represented as completed |
| Financial approval separation | Existing supplier approval checks use `superAdminActor()` | Client rule says Super Admin access alone must not grant financial authority. Design separate approved authority gates before any production financial approval |
| 55 Admin modules | Existing code covers a subset of oversight and operational modules | Trace each requirement against proposed target platform, define dependencies and phased implementation; do not populate missing modules with mock actions |

## Key security boundary

The current application is **not certified** for production privileged Admin use just because these source controls pass. Existing finance and payout behavior is preserved, not newly authorized. No change in this phase grants broader access or enables payments, public signup, provider transfers, external notifications or database migrations.

Client-approved MFA and financial-authority requirements are known source requirements; their **technical implementation**, and any conflicts with the architecture, remain an unresolved R00 release gate. Do not turn on privileged financial workflows until these gates are accepted and tested.

## Release acceptance still required

- Test unauthenticated, unverified, suspended and wrong-role access to every protected page/API.
- Validate each Admin route within a real configured Supabase session with allowed role accounts.
- Confirm tenant/record scope, audit history, SoD (segregation of duties) and financial authority in real data.
- Test the new Admin architecture, MFA, invitation/role changes and permission override policy after product owner approval.
- Verify CI, production build and public/browser release checks; privileged live acceptance remains separate.

No new database tables, client secrets, mock operational data or unapproved permissions were introduced here.
