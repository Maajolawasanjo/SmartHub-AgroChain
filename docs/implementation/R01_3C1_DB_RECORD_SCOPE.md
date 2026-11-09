# R01.3C.1 — Database-Enforced Existing Field Scope and Private Evidence

**Status:** Source implementation; CI required. This is a narrow live-code hardening milestone, NOT the client's complete departmental/individual permission system or a production-acceptance certificate.

## Requirement trace and code audit

Sources (private, not committed):
- *SMARTHUB AGROCHAIN LTD - ADMIN DASHBOARD WEB IMPLEMENTATION*, §5 (pp. 7–8): backend and API controls, Field Agent access to assigned work, explicit record-level enforcement.
- Same source, Team & Access cross-module integration pp. 1233–1236, 1243–1251: scope must follow authoritative records; changes to assignments must affect access; role alone never implies all records.
- Master Admin Requirements Register, Team & Access group and integration addendum 91635, p. 8. Protected 102-requirement workbook row IDs remain to be attached; do not guess IDs in a public PR.

Existing read path:
1. `requireFieldAgentApi` confirms Supabase user, provider email and current database account role/status.
2. `assertAgentCanReadVisit` obtains active state assignments and then checks visit ownership/farm state in a *second query*.
3. `fieldEvidenceRedirect` checks visit scope and then fetches the ready evidence object path *in a third query*, before signing a 60-second Storage URL.
4. The existing field mutation methods lock account, visit and farm and check state assignments within transactions. Those paths remain unchanged.

The separate-read shape can act on different snapshots when scope changes between reads. It is particularly risky when retrieving private evidence through a service-role Storage client.

## Implemented

- `src/server/field-agent/record-scope.ts` performs **parameterized, read-only SQL** via Prisma `$queryRaw` against existing `app_accounts`, `field_visits`, `farms`, `field_agent_assignments` and `field_visit_evidence` tables. No new tables or indexes.
- The visit read joins the **current account's ACTIVE FIELD_AGENT role**, visit ownership and **active state-scoped assignment** in a single query.
- The evidence read fetches a READY object path **only in the same SQL statement** that checks evidence ID, visit ID, actor, account status and active farm-state assignment. Unauthorized/missing evidence results in a generic 404.
- The existing visit-scoping wrapper now delegates to this database-backed guard. Private evidence signed URLs are generated only from the scoped query's object path, never from a separately unrestricted evidence lookup.
- `tests/r01-3c1-db-record-scope.test.mjs` executes both functions with a controlled Prisma mock (valid/invalid IDs, missing record, verified path), checks parameter binding, and inspects the SQL predicates and unchanged private Storage boundary.

## Database schema and approval impact

| Item | R01.3C.1 |
| --- | --- |
| Existing Field Agent state assignments | Read at authorization time |
| New departmental roles/templates | Not implemented |
| Personal grant/deny persistence | Not implemented |
| Prisma schema / migrations | **Unchanged** |
| Supabase JWT/claims/RLS | **Unchanged** |
| Admin API effective-permission evaluator | Existing R01.3A fixed matrix unchanged |
| Finance/refund/settlement privileges | Unchanged |
| Payment and payout flags | Unchanged |
| Private evidence Storage URL | Remains 60-second signed URL |
| Public API output | Same existing shape |

**Important limitation:** an already-issued signed URL may remain usable until its short expiry after assignment revocation. A single-query check reduces authorization-time inconsistencies; it does not guarantee retroactive revocation of an issued Storage link. For highly confidential data requiring immediate revocation, a server-streamed authorization model and corresponding client UX/security policy must be designed and tested separately.

## Final R01.3C permission-persistence design (blocked)

The candidate tables described in `R01_3A_CAPABILITY_AND_SCHEMA_DESIGN.md` are **not** ready for migration. Before implementing persistent `admin_role_templates`, approved `admin_principal_roles`, `admin_personal_exceptions`, `admin_record_scopes`, `admin_access_events` or an authoritative session-aware resolver, product-owner decisions must be recorded:

- `R00-D01`: separate vs integrated Admin deployment, data ownership and migration boundary.
- `R00-D04`: role assignment authority, approval and restriction lifecycle, two Super Admin identities, MFA/assurance, revocation and recovery rules.
- `R00-D09`: financial approval authority and maker/checker segregation.

Do **not** interpret “go on” or passing CI as approval to grant privileges or run schema changes. The private requirements matrix is not available for editing; no row is marked complete.

## Testing and acceptance

- **CI required before merge:** source tests, Prisma validate, TypeScript checks, production Next.js build and public browser regressions.
- **Future staging gate:** use real Supabase accounts, sample farm states, active/revoked assignments, cross-agent visit/evidence IDs, suspended accounts, and confirmed Storage configuration to test 200/404 behavior. Confirm race behavior and already-issued URL expiry.
- **Production:** no claim of deploy or acceptance without explicit test evidence on the intended target.

Next approved increment is the persistent Admin role/exception schema, isolated migration tests, audited service integration, record scope across **all** modules and negative role/record tests.
