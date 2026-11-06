# R01.2 — Admin Role and Permission Blueprint (read only)

**Release status: catalogue implemented; the expanded Admin system is not yet approved or production-accepted.**  
**Source documents:** client-provided *SmartHub AgroChain Admin Dashboard Master Requirements & Implementation Traceability Register*, Groups 1–12 and Team & Access, plus *SMARTHUB AgroChain LTD — Admin Dashboard Web Implementation*, Section 5. The detailed original specifications and cross-module addenda remain authoritative. This summary does not replace them.

## Deliverable

The existing /admin/permissions page now distinguishes **today's server-enforced fixed permissions** from the **requested Admin access model**, with no route to create privileges from this new UI. This is **not an implemented role grant**; it is requirements metadata for review only. The target catalogue lives at `src/server/admin/target-access-blueprint.ts`, is server-only, and is explicitly marked `NON_EXECUTABLE_REQUIREMENTS_CATALOGUE`. It intentionally has no mapping of target roles to effective grants. It introduces no additional `AccountRole` enum values, no Supabase claims, no permission grants and no schema migrations.

The requested eight initial role templates are:

| Client-specified role template | Current implemented account-role correspondence |
|---|---|
| Super Admin | `SUPER_ADMIN`, partially aligned; privileged MFA and role/financial governance missing |
| Operations Officer | `OPERATIONS`, partial fixed permission set |
| Field Agent | `FIELD_AGENT`, partial fixed permission set |
| Sourcing Officer | None |
| Fulfilment / Logistics Officer | None |
| Finance Officer | None |
| Support / Communications Officer | None |
| Content Editor | None |

The client requests seven permission actions: **view, create, edit, approve, delete, export, and manage**. Effective access must consider department/role templates, authorized personal overrides, per-record scope, account lifecycle, independent approvals, event audit and applicable document confidentiality. This phase implements **none** of the new grants.

The client also specifies **12 module groups**: Overview; Farmers & Buyers; Field Operations; Products & Supply; Sourcing & Quotes; Orders & Fulfilment; Finance; Support & Disputes; Content & Communications; Reports & Audit; Team & Access; System Settings. The catalogue labels all 12 *not accepted end-to-end*, because an existing page or backend function alone is insufficient proof.

## Verified implementation gap

The active code at this milestone retains five `AccountRole` values (`BUYER`, `FARMER`, `FIELD_AGENT`, `OPERATIONS`, `SUPER_ADMIN`) and a fixed role/permission table. Staff invitation and role change support only `FIELD_AGENT` or `OPERATIONS`. There is no implemented per-user grant/deny evaluator or controlled departmental-role onboarding.

The separate source requirement that two designated Super Admin accounts have different responsibilities, that privileged accounts have **mandatory MFA from launch**, and that Super Admin access conveys **no automatic financial authority** is **not satisfied by the existing current-role checks**. Do not rely on current Super Admin access to activate production financial operations.

## Architecture and authorization decisions

- **R00-D01 — Admin architecture:** The master register calls for a new Admin project built from the ground up, while earlier material refers to reusing the existing implementation. Confirm deployment, authoritative business record/API ownership, shared authentication boundary, operational integration, database access and migration strategy before building a new Admin system. Do not duplicate transaction tables.
- **R00-D04 — privileged-access model:** Confirm detailed role templates, individual grant/deny policies, MFA enforcement and recovery flow. Approvals must preserve the client-specified two-person safeguards.
- **R00-D09 — financial authority:** Establish explicit separate authorization for finance, payables, refunds and transfer approvals, beyond holding a Super Admin role.

All three gates remain `PENDING_OWNER_DECISION` in `docs/implementation/r00-gates.json`. No software implementation, HTML copy, or passing CI test constitutes client signoff.

## Required build sequence after approval

1. Confirm the **new Admin architecture** and identify the single authoritative owner of identity, business records, finance events and audit logs.
2. Design a permission schema: role templates, capabilities, principal assignments, scoped grants/restrictions, grant provenance, expiration/revocation, immutable auditable events, and a deny-by-default effective-permission resolver **once precedence policies are explicitly approved**.
3. Deliver privileged MFA, two designated Super Admin identities and controlled recovery, then prove privilege changes cannot bypass MFA or a second authorized approver where required.
4. Apply authorization through a single trusted backend/service layer in **pages, APIs, actions and row/record-level queries**.
5. Implement and test role-specific staff invitations, role templates, individual permission changes, revocation, audit evidence and session invalidation.
6. Verify separation of financial authority from platform administration, including self-approval prohibitions, provider reconciliation and independent signatures, before any real funds move.
7. Run cross-role and negative-case integration tests with real test identities, assigned records and provider test transactions. Confirm no privileges leak across organizations or states.

**Current acceptance:** This PR delivers a reviewable client-requirements catalogue and regression protection only. It does not implement the expanded permission model, Admin architecture, MFA or financial segregation.
