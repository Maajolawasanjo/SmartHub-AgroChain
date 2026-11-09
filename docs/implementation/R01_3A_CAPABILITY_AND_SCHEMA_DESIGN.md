# R01.3A — Current Capability Decision and Proposed Permission Schema

**Implementation status: SOURCE-IMPLEMENTED; awaiting CI, product-owner decisions, staging acceptance.** This milestone is not the final Admin authorization system, a database migration, an MFA implementation or production acceptance.

## Requirement basis and dependency

- Private client source: *SMARTHUB AGROCHAIN LTD - ADMIN DASHBOARD WEB IMPLEMENTATION*, section 5 (User Roles, Staff Access and Permissions), pp. 7–8. Requires backend-enforced view/create/edit/approve/delete/export/manage controls, per-person restrictions, and record-level scope.
- Private client source: *Admin Dashboard Master Requirements & Implementation Traceability Register*, Team & Access, p. 8. The approved integration addendum (91635) requires two designated Super Admin accounts, mandatory privileged MFA, and no automatic financial authority.
- Private requirement IDs: link this milestone to the corresponding Team & Access rows of the protected 102-row workbook. The detailed workbook and client quotations **must not be committed to this public repository**.
- R00-D01 (separate Admin deployment and authoritative data ownership), R00-D04 (privileged governance, override precedence, MFA/recovery) and R00-D09 (independent financial approval) remain **PENDING_OWNER_DECISION**. See `r00-gates.json`.

## Existing implementation audited

| Component | Observed current implementation | Gap |
| --- | --- | --- |
| `prisma/schema.prisma` `Account` | Supabase Auth UUID, five fixed `AccountRole` values, account status | No departmental roles or per-person capability grants |
| `src/server/admin/permissions.ts` | Current fixed role→permission matrix; 4 allowed Admin API namespaces | No individual grants/denies, expiration, scope policy |
| `src/server/admin/guard.ts` | Provider email verified, ACTIVE account, OPERATIONS/SUPER_ADMIN, declared capability | No privileged AAL2 MFA, individual overrides or approved scope engine |
| `src/server/auth/context.ts` | `auth.getUser()`, authoritative database account, role and status | Session revocation and assurance need scoped privileged policy |
| `FieldAgentAssignment` | Active state-specific field assignment | Must not be interpreted as global permission to read every farmer |
| `AuditEvent` | General access and staff events | Future grant provenance and immutable decision-event contract still needed |
| finance services | Separate route-level actor and business checks | Not a substitute for independent financial authority |

## What this PR actually changes

1. Adds `src/server/admin/current-access-decision.ts` with a typed, **deny-by-default evaluator** for only the existing Admin API capability model.
2. Calls it from `requireAdminApi` **in addition to the old checks**. A legacy actor denied previously remains denied. No additional actor can gain a permission through this step.
3. Requires a declared internal Admin namespace, matching fixed role grant, active account and confirmed provider email. The decision reports an internal reason but the HTTP response remains generic.
4. No changes to `AccountRole`, privilege grants, Supabase claims, RLS policies, Prisma schema, migration files, MFA configuration, payment flags or payment services.

This deliberately small integration is a regression-safe transition; removal of duplicate checks comes only after an approved effective-permission model and parity tests.

## Candidate permission data model (DESIGN ONLY — no migration)

**Naming is provisional until R00-D01/D04 are approved.** Prefer keeping access metadata in an authenticated server-managed schema that is not directly exposed to browser clients. The final physical storage owner depends on the Admin architecture decision.

| Proposed entity | Purpose | Safety constraint |
| --- | --- | --- |
| `admin_role_templates` | Versioned role templates with owner, state and effective dates | Role exists does not imply user is assigned |
| `admin_capabilities` | Canonical module + action + resource identifiers | Unknown capability denies, no wildcard financial authority |
| `admin_template_capabilities` | Explicit per-template allowed capability IDs | No implicit Super Admin finance grants |
| `admin_principal_roles` | Approved principal→template assignment and expiration/revocation | Actor ID always server-derived; authorization and audit mandatory |
| `admin_personal_exceptions` | Approved scoped grant/deny exception linked to one person and capability | Deny precedence and approval workflow unresolved; do not implement until R00-D04 |
| `admin_record_scopes` | Resource/organization/region/assignment scope policy, with lifecycle | A module permission never implies unrestricted record access |
| `admin_access_events` | Append-only actor, subject, decision, reason, approval reference, timestamp | History survives revocation; confidential details excluded from client responses |
| `admin_privilege_approvals` | Independent approver and requester references where approved | Self-approval and financial authority subject to R00-D09 |

**Integrity requirements for final migration:** foreign keys to authoritative identity; explicit constraints and indexes for active assignments; unique scope/capability keys; non-null provenance; auditable revocation; concurrency-safe approval transitions; reason-coded expiry; row-level access rules; no privileged client writes; no cross-tenant records; no orphaned entitlements after suspension. Use decimal/currency structures only in financial modules, not in generic access grants.

**Authorization evaluation (target, not active):** provider-verified session and approved assurance level → active account → valid role assignment → effective capability after approved override precedence → record scope → conflict/self-approval/financial independence → allow or deny with audit evidence. An absent or invalid input must deny. User-editable Supabase `user_metadata` cannot serve as an authorization source. JWT claims alone must not be assumed fresh for immediate privilege revocation.

## Deferred owner decisions

- **R00-D01:** distinct Admin application or integrated deployment; single source of truth for identity, records, audit and migrations.
- **R00-D04:** per-person grant precedence and expiry, departmental role governance, the two designated Super Admin duties, MFA enrollment/login/recovery, access change approvers.
- **R00-D09:** who may approve refunds, payables and transfer initiation; maker/checker rules, explicit delegated financial entitlements and audit obligations.

Until those decisions are recorded, **do not create the proposed tables, run migrations, invite new role templates, assign personal exceptions, modify production RLS, switch on payouts, or claim privileged MFA compliance.**

## Acceptance evidence and next implementation increment

**Source gate:** permission evaluator and guard compile; negative tests cover unverified/inactive/non-admin, unknown capability and fixed-role non-grants; source inventory and CI must pass.

**Environment gate, not supplied by this PR:** Auth session tests, backend 403 checks for every role, account suspension, permission revocation latency, cross-user record checks, MFA assurance, separate approver verification, audit durability, staging DB migration checks and browser acceptance with seeded test identities.

Next, after approved decisions: R01.3B introduces versioned templates and scoped exceptions with migrations created using the checked-out project's CLI, deployed first through the approved isolated staging procedure. Changes to financial approval policy remain gated separately.
