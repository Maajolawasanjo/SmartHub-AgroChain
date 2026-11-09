# R01.3D.3D — Cross-Portal Privileged MFA Boundaries and Whole-App API Inventory

**Status:** Source implementation; NOT an activated mandatory MFA program, NOT a working privileged recovery operation and NOT a production security acceptance.

## Client trace and current architecture

- Private client source: SmartHub Admin Dashboard Web Implementation, Team & Access Cross-Module Integration, sensitive staff actions, access scope and independent reviews.
- Private Master Admin Requirements & Traceability Register, Team & Access addendum 91635: mandatory privileged MFA, two designated Super Admin responsibilities, independently authorized finance decisions and two-person lost-device recovery where feasible.
- The protected 102-requirement workbook cannot be edited/verified here; don't assume exact acceptance cells.
- R00-D01 (topology), R00-D04 (MFA and recovery) and R00-D09 (financial authority) remain `PENDING_OWNER_DECISION`.
- Prior R01.3D.3A/B/C added individually gated, dormant MFA to Admin, Operations, selected staff finance, sensitive account actions, and AAL1-accessible authenticator enrollment. **All these changes are dormant while governance gates remain pending.**

## Scope and observed cross-portal gaps

The older inventory tracked 49 Admin/Operations/account/Auth routes. Some elevated operations, however, are reachable through `/api/support`, `/api/shipments`, other workspace namespaces or signed provider callbacks. A path prefix alone must never be treated as an authorization boundary:

| Class | Existing authorization | R01.3D.3D action |
| --- | --- | --- |
| `/api/support/cases/[id]/messages` | Current verified active workspace account, staff ownership/assignment, private-note restrictions | Staff internal note or reply to another user's case now adds **dormant staff MFA** before the mutation transaction |
| `/api/support/cases/[id]/transition` | Current verified active workspace account, staff role/assignee checks, owner-only reopen | Staff claim/resolve/close/wait/resume adds **dormant staff MFA**; case owner reopening stays AAL1 |
| `/api/support/cases` | Current verified active workspace account and case-creation keys | **Unchanged.** New support requests remain possible at AAL1, including lost-device support |
| Support case list/detail reads | Role, owner and assignment handling; staff may see internal messages | **Not included in this increment**; must review staff sensitive-read MFA and scope before signoff |
| `/api/shipments/[id]/evidence/**` | Current active DB role, verified provider email, buyer membership or assigned Operations scope, private Supabase storage | Shared evidence `actor()` now adds **dormant Operations/Super Admin MFA** before upload and signed-URL reads; buyer role is unchanged |
| `/api/payments/paystack/webhook` | Size cap, raw-body signature validation, independent provider reference/transfer verification | **No user-session MFA introduced**. Webhooks must keep their provider-signed service-to-service security model |
| `/api/internal/readiness` | Release-only protected Bearer health token | Unchanged. Probe is a service identity, not a signed-in staff action |
| Auth accept-invite / callback / public registration | Provider proof, approved invitation, single-use confirmation, existing public validation | Unchanged. Do not add staff MFA before a new staff member can establish a verified session |
| Buyer / Farmer / Field Agent scoped API | Account-role checks, buyer organization/assignment/ownership, scoped evidence | **Classified but not all individually integration-tested.** No new privileges |
| Inbox / preferences | Active account and record-owned query restrictions | Classified; additional inspection required for service-to-service notifications |
| Account recovery, sign-out, defensive session revocation | Current recovery token and provider Auth policy | No new AAL2 restriction. A lost authenticator must not prevent account sign-out or safe recovery requests |

## Code implemented

1. `src/server/communications/staff-mfa.ts` — server-only, role-specific router for the previously implemented `requireOperationsMfaForActor` and `requirePrivilegedMfaForSuperAdminActor`. Nonstaff are denied by the helper. When release approvals are missing, the underlying role-specific gate performs **no provider MFA call**, preserving current behavior.
2. `src/server/communications/support.ts` — staff replies on another account's case, private internal notes, and staff workflow status transitions call the helper **before database mutations**. Existing assignment/ownership, current account status and audit events remain authoritative. A current staff member can still open a support case at AAL1, reply as the owner without internal privileges and reopen their own resolved case without a factor challenge. The underlying transactional role/scope checks are unchanged.
3. `src/server/fulfilment/evidence.ts` — current active provider-verified staff account calls the role-specific MFA gate before reading, uploading or signing shipment evidence. Current buyer-owned scope, assigned Operations scope, file-type validation, private bucket, link expiration and account-lock checks remain as before.
4. `docs/implementation/r01-3d3d-crossportal-entrypoints.json` — **96 actual `src/app/**/route.ts` endpoints** enumerated from GitHub, including non-API Auth callbacks and provider webhooks, with review classifications. Every entry is explicitly `liveSessionMfaVerified:false` and `individualRouteAccepted:false`; overall approval is also false.
5. `tests/r01-3d3d-crossportal-route-inventory.test.mjs` — real helper branching tests, negative nonstaff cases, ordering and recovery exemptions for support, shipment cross-portal staff protection, provider signature-before-parse checks, AAL1 account safety exemptions, exhaustive route inventory comparisons and unchanged governance gates.

## Why this is still NOT sufficient for MFA enforcement signoff

- A source route inventory and static path-level tests are **not** a full service authorization audit. Business service functions and server actions can have additional callers beyond the HTTP routes.
- The support staff sensitive **read paths** (support case list and details) have NOT been fully covered. Access to confidential internal support notes, same-user account ownership, assignment changes and staff suspension all require dedicated signed-in negative tests.
- Shipment evidence has explicit role and record scope, but provider outage, expiry, cross-tenant, assignment revocation, browser download and existing signed URL lifetime need live integration.
- Provider webhook signature checks must be tested end to end with signed provider payloads, replay scenarios, queue reconciliation and provider-side reference verification. They cannot be protected by the end-user AAL2 check.
- No real Supabase test accounts were provisioned or changed. No live enrollment/challenge/revocation tests or two-person lost-device recovery exercises were run. Source-level helper simulations do **not** prove live Auth provider behavior.
- The new inventory marks every reviewed-class route **unaccepted**. New endpoints will fail tests until recorded. This is intentionally stricter than treating an enumerated route as approved.
- No Prisma migration, database RLS changes, new staff role/financial grants, Supabase Auth provider config, Vercel project settings, feature flag, payment/webhook behavior or existing financial approval rules are changed by this milestone.

## Release gates, owners and next work

| Requirement | State |
| --- | --- |
| Source Node tests + Prisma/typecheck/Next build + desktop/mobile public browser | GitHub CI required |
| Actual signed-in MFA AAL1/2 positive and negative tests in isolated environment | **NOT DONE** |
| Staff support read-path authorization and record scope | **PARTIAL** |
| All App Router routes enumerated and unapproved | **SOURCE INVENTORY CREATED** |
| Provider webhooks, DB functions, RPC, server actions and background workers individually verified | **NOT DONE** |
| Lost MFA factor/independent recovery officers and revocation | **NOT IMPLEMENTED / NOT APPROVED** |
| R00-D01, R00-D04, R00-D09 | **PENDING OWNER DECISION** |
| Mandatory MFA live | **NOT ACTIVATED** |
| Vercel production deployment of latest main | **NOT CONFIRMED; previous Vercel build-rate-limit failures** |

**Next R01.3D.3E:** audit and protect sensitive support *read* access without blocking case-owner recovery; create a test-only Supabase MFA end-to-end acceptance harness using isolated credentials (never production accounts), and design durable two-officer recovery with full approval and revocation. Keep activation gates off until approvals and tested recovery are complete.
