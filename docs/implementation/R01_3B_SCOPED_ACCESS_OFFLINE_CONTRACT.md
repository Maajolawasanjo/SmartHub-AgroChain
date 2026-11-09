# R01.3B — Scoped Roles and Individual Exceptions (OFFLINE Contract)

**Milestone:** SOURCE-IMPLEMENTED candidate evaluator; CI and code review required. **NOT an operational permission grant system or an accepted release.**

## Requirements and sources

- Private client source: *SMARTHUB AGROCHAIN LTD – ADMIN DASHBOARD WEB IMPLEMENTATION*, Team & Access — Role Templates (§23 tests, pp. 1194–1196), Individual Permissions, and Team & Access Cross-Module Integration addendum (pp. 1233–1236, 1243–1251).
- Private client source: *Admin Dashboard Master Requirements & Implementation Traceability Register*, Team & Access dependencies and addendum 91635, p. 8.
- Approved source rules: distinct staff/auth/role/exception authorities, no access based solely on job title, assignment or engagement; active restrictions take precedence within scope; expired/revoked sources do not grant; independently valid sources retain provenance; no self-grants; unresolved conflicts deny; record scope is enforced by every module.
- Detailed requirement IDs belong in the protected 102-requirement workbook. The workbook was not available as an editable repository artifact, so **no requirement row has been marked accepted**.

## Implementation

`src/server/admin/candidate-access-resolution.ts` adds a **pure offline authorization simulator** for future role assignments and individual exceptions. It includes:

- The approved seven verbs and twelve administrative module-group identifiers, with no additional active account roles.
- A typed scope contract for company-wide, own-record, assigned-record, department, state, Local Government Area (state + LGA), operational area, project, and business relationship.
- Server-derived actor context as a future requirement: authenticated identity, verified provider email, active account, linked staff record, eligible engagement.
- Versioned role-assignment evidence and separately approved individual grant/restriction evidence, each carrying source ID, principal, approval reference/approver, status, effective date, optional expiration and scope.
- A deny-first algorithm in the **simulator only**: only active, time-valid, approved, non-self-authorized, matching records are considered. Restrictions in scope block grants; multiple valid sources retain separate source IDs. Missing separation-of-duties review or unresolved conflicts block a simulated allow.
- Deliberate refusal to simulate access for **all finance, team-and-access, system-settings and approval actions**, because R00-D04/D09 and privileged controls remain unresolved.
- Explicit `OFFLINE_SIMULATION_ONLY` result metadata so even a successful fixture never represents a production grant.

`tests/r01-3b-candidate-access-resolution.test.mjs` executes the actual contract logic with Node type stripping. Tests cover positive and negative matching, all scope categories, suspended accounts, unverified identities, missing roles, future/expired/revoked assignments, missing provenance, individual restrictions, independently valid sources, conflicts, unknown actions, and privileged finance denial.

**Security boundary:** The simulator is not imported into a live guard, API, page, payment service, Supabase RLS policy or server action. A source-inventory test enforces that isolation. The live `requireAdminApi` remains on the existing R01.3A fixed permission matrix. This phase makes **no changes** to Prisma, database tables, migration history, Supabase, payment providers, release flags, staff invitations or operational permissions.

## What is NOT completed

The final client model needs database-backed Staff Directory eligibility, role-template versioning, approved assignments and individual exceptions, server-side effective-permission resolution, record-scoped queries, audit events, revocation/session invalidation, cross-role browser/API tests, and privileged MFA.

This offline contract does **not** certify identity ownership, current session assurance, approval authenticity, DB/RLS enforcement, finance separation, provider authorization or actual cross-user access protection. Inputs are only hypothetical fixtures. Do not wire it to runtime authorization or start migrations without formal approval.

## R00 owner decisions still blocking activation

- **R00-D01:** separate Admin deployment versus integrated system, authoritative owner for identity/records and migration path.
- **R00-D04:** approver identities, permitted role combinations, staff-invitation/role lifecycle, grant/restriction governance, privileged MFA, two Super Admin duties, recovery and session revocation.
- **R00-D09:** independent financial authority, refund/settlement maker-checker responsibilities, financial approval workflow.

The source already establishes a broad **restriction-overrides-grant** rule; approval is still needed for the concrete role/grant policies and the authority empowered to enact them.

## Milestone acceptance

| Evidence | Required result |
| --- | --- |
| `npm test` | Offline candidate evaluator tests plus all existing regression tests pass |
| Prisma validate, TypeScript and Next.js build | Pass without migrations |
| GitHub CI and browser acceptance | Pass before merge |
| Diff audit | No live authorization imports or privilege/data-plane changes |
| Staging identity, revocation, MFA, authorization and database tests | **NOT RUN**; must be completed before operational acceptance |
| Requirements Matrix row acceptance | **NOT UPDATED**; protected workbook and source-specific IDs required |

**Next safe work:** after decision approvals, implement R01.3C data-backed role/exception lifecycle and scope enforcement in a reviewed migration and staging environment, then privileged MFA and independent approval governance before release.
