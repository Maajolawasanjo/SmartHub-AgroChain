# R01.3C.2 — Persistent Admin Permissions: DORMANT Data Contract and Deployment Gate

**As-built status:** proposal and offline source tests only. **No live permission persistence, database migration, privileged authorization, MFA or production acceptance.**

**Depends on:** R01.2 (source-defined templates), R01.3A (current fail-closed Admin API guard), R01.3B (scoped offline permission simulation), R01.3C.1 (existing Field Agent database scope hardening).

## Exact approved-client requirements

- *SMARTHUB AGROCHAIN LTD — ADMIN DASHBOARD WEB IMPLEMENTATION*, Team & Access / Role Templates, pp. 1193–1196: versioned role templates and assignments, previous versions preserved, conflicting permissions detected, sensitive approvals separated and auditable.
- Same source, Individual Permissions, pp. 1196–1202 and 1214–1217: separately approved individual grants or restrictions, clear business reasons, temporary permission expiry, approval vs provisioning distinction, review, revocation and complete history.
- Same source, Team & Access Cross-Module Integration, pp. 1233–1236 and 1243–1251: separate Staff Directory, Supabase Auth, template and exception authorities; centralized effective access and record scope; independent restrictions dominate overlapping grants; account suspension/offboarding denies ordinary access.
- *SmartHub AgroChain Admin Dashboard Master Requirements & Implementation Traceability Register*, Team & Access integration and governance, p. 8. Two designated Super Admin accounts, launch-time privileged MFA and independent financial authority remain required.
- **Requirement row IDs** must be attached to the relevant Team & Access rows of the protected 102-row workbook by the workbook owner; no IDs or acceptance checkboxes have been invented.

## Code and database audit

Existing live database: Supabase Auth identity linked to `app_accounts` through `Account`, five fixed `AccountRole` variants, active/suspended account status, `StaffInvitation`, `FieldAgentAssignment` and `AuditEvent`. It lacks a dedicated Staff Directory with engagement eligibility, approved role versions, individual grant/restriction records, auditable provisioning, temporary expiry, and independent privileged approval records.

Existing live API: `requireAdminApi` enforces the current role matrix and provider verification. Candidate permission simulation is not connected to runtime. Financial approval services are separately guarded. These current controls remain authoritative.

## This milestone's deliverables

1. `src/server/admin/proposed-permission-hydration.ts` introduces a **dormant, fail-closed boundary** for future database rows. It never fetches from the current DB and it is **not imported by any live route, guard or service**. It rejects malformed active entries, unknown modules/actions, self-approval, unprovisioned evidence, missing rationale/approval, impossible version/times/scope, duplicate source IDs and disputed finance/access-governance/approval capabilities. It retains separate valid role and individual restriction sources, and ignores expired, suspended or revoked history. The output is explicitly tagged `DORMANT_PERSISTENCE_PROPOSAL`, never `allowed`.
2. `docs/implementation/drafts/R01_3C2_PERMISSION_STORE.sql.disabled` contains a **non-executable SQL schema proposal** for Staff Directory linkage, reusable role templates, immutable version references, capability-by-scope sets, scoped role assignments, individual grant/restrict exceptions, and append-only access change events. It is **outside** `prisma/migrations`, explicitly aborts within a transaction before any DDL, has no applied migration identifier, and contains no granted permissions or RLS allow policies.
3. `tests/r01-3c2-persistence-hydration.test.mjs` executes row hydration using Node type stripping and asserts the SQL file's intentional kill switch, lack of runtime imports and absence of new live Prisma models.

The draft SQL assumes the current integrated `public.app_accounts` authority and **must be rewritten if R00-D01 selects a separate Admin service**. It is a design reference, not a schema that can be applied as-is. Approval or role changes must never directly modify live `Account.role` based on this draft.

## Security and lifecycle invariants

- A Staff Directory record is not the same as an Auth account; staff identity, engagement and account linking each need an approved lifecycle.
- Approval and provisioning are separate states: `APPROVED` must never grant access until `PROVISIONED` and `ACTIVE` are verified.
- The requester may be the recipient, but the recipient cannot approve their own access; requester and approver must also be separate.
- Expired, revoked, suspended, failed provisioning and invalid evidence cannot contribute privileges.
- An active restriction must block an otherwise valid template or personal grant inside the affected scope.
- Provenance of multiple valid grants is retained; removing one valid source must not erase unrelated grants or prior audit history.
- Action and record scope must be enforced in SQL for every actual business query. Department, job title or manager cannot independently grant access.
- Privileged actions, finance, refunds, transfers and independent approvals remain blocked until R00-D04/D09. Company-wide access must never be assumed from a title.
- Draft access tables require RLS and explicit revocation of browser roles. A server connection able to bypass RLS must enforce the same rules itself; simply adding RLS is not proof of safe authorization.
- Database constraints do not themselves validate all business rules, e.g. entitlement approval, session assurance, role status, staff eligibility or approval conflicts. These need checked transactional services and integration tests.

## Release and database migration boundary

The following decisions are **PENDING_OWNER_DECISION** in `r00-gates.json`:

- **R00-D01:** integrated vs separately deployed Admin app; authoritative database, data ownership, identity integration and migration topology.
- **R00-D04:** role lifecycle approvers, two designated Super Admin duties, independent access reviews, mandatory MFA/AAL2, exception handling, recovery and session revocation.
- **R00-D09:** independent finance authority, payment/refund/settlement maker-checker and approval segregation.

**Until all affected decisions are recorded:** do not move the disabled SQL into Prisma/Supabase migrations, deploy tables, add grant endpoints, alter Auth claims or RLS to allow access, route live authorization through the candidate normalizer, invite new roles, or describe any new permission as active.

After approval: generate a reviewed migration using the project's chosen migration CLI, resolve database ownership and FK mappings, implement transactional permission lifecycle and audit, validate migration forward/rollback on a backed-up isolated environment, verify RLS as each distinct role, test cross-role access and revocation, and only then integrate a centrally audited runtime evaluator. All R01.3 permissions must remain fail-closed throughout.

## Acceptance evidence and open verification

| Check | R01.3C.2 status |
| --- | --- |
| Candidate schema and hydration code | Authored for review |
| Structural/unit tests and CI build | Must pass before merge |
| No grant activation or DB migration | Required; diff audit and tests |
| Postgres migration execution / schema advisors | **Not run** — proposal is deliberately unexecutable |
| Supabase authentication + authorization + MFA tests | **Not run** |
| Financial maker/checker integration | **Not run** |
| Private 102-requirements workbook updates | **Not performed** — editable workbook not available |
| Production deployment and acceptance | **Not certified** |

**Next:** obtain scoped owner decisions; then implement real database-backed role/exception creation, approval, provisioning, revocation, audit and record-level enforcement with negative integration tests.
