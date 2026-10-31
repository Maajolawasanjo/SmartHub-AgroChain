# Phase 04 — Staff Identity, Assignments & Permissions

## Purpose

Replace the Super Admin staff placeholders with an authenticated, auditable staff-governance workflow. This phase manages only provisioned `FIELD_AGENT` and `OPERATIONS` accounts. It does not permit public staff signup, staff self-role selection, or staff creation of a `SUPER_ADMIN`.

## Delivered

- Super Admin-only staff directory, staff detail, role, status, assignments and activity screens.
- Invitation issue, listing, expiry display and revocation.
- Fixed role-to-permission templates with a read-only matrix. There are no arbitrary per-user permission grants.
- Reauthentication before invitation, role, status, assignment and revocation mutations.
- Optimistic role/status transitions, row-locked Field Agent assignment updates, and audit records with structured `details`.
- Field Agent state scopes use the same canonical labels as farmer onboarding (`FCT - Abuja` included).
- Supabase Auth ban/unban is server-only. Suspension is recorded in the application database before Auth ban synchronization; reinstatement lifts the Auth ban before making the application account active. Provider synchronization failures return a non-success response and are audited.
- Invite delivery failure/uncertainty is stored in a non-accepting invitation state. The acceptance endpoint still accepts only a pending, unexpired invite.

## Fixed permissions

| Role | Permission template |
|---|---|
| Buyer | Create sourcing requests |
| Farmer | Manage own supply |
| Field Agent | Read assigned work and submit field evidence |
| Operations | Review farmer/supply records, manage catalog metadata and public enquiries |
| Super Admin | Operations oversight plus staff invite/manage/assign, audit and permission-template review |

The Super Admin template does not grant buyer/farmer impersonation. Role values remain server-owned in `app_accounts`; `user_metadata` is not an authorization source. Staff role changes are limited to Field Agent and Operations. Field Agent endpoints in the next phase must additionally filter each record by the agent's active state scope; this phase creates and audits those scopes but does not yet implement the field visit workflow.

## Routes

### Admin pages

- `/admin/staff`
- `/admin/staff/invite`
- `/admin/staff/invites`
- `/admin/staff/[id]`
- `/admin/staff/[id]/roles`
- `/admin/staff/[id]/status`
- `/admin/staff/[id]/assignments`
- `/admin/staff/[id]/activity`
- `/admin/permissions`
- `/admin/audit`

### APIs

- `GET /api/admin/staff`
- `GET /api/admin/staff/[id]`
- `POST /api/admin/staff/invite`
- `GET /api/admin/staff/invitations`
- `PATCH /api/admin/staff/invitations/[id]` — revoke
- `PATCH /api/admin/staff/[id]/role`
- `PATCH /api/admin/staff/[id]/status`
- `GET|PUT /api/admin/staff/[id]/assignments`
- `GET /api/admin/audit`

All staff mutation endpoints require a confirmed active Super Admin, same-origin request, validated input and current-password reauthentication.

## Data migration

`prisma/migrations/20261103000000_staff_governance/migration.sql`:

- adds structured JSON audit details;
- adds `field_agent_assignments` with a unique `(fieldAgentId, state)` constraint and canonical state check;
- enables RLS and revokes `anon`/`authenticated` Data API grants for the assignment table;
- adds invitation delivery states and a single-pending-invitation index.

No migration is automatically applied by the application. Before applying to a database that already contains staff invitations, inspect duplicate pending emails first:

```sql
SELECT lower("email") AS email, count(*)
FROM "staff_invitations"
WHERE "status" = 'PENDING'
GROUP BY lower("email")
HAVING count(*) > 1;
```

Resolve any duplicates deliberately before applying the unique index. For the not-yet-created SmartHub project, the migration should be applied in the approved migration sequence after the preceding phases.

## Runtime configuration and limitations

- Requires SmartHub's own Supabase project, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `APP_BASE_URL` and `AUTH_RECOVERY_SECRET`.
- Supabase Auth email delivery must be configured. No invitation is considered sent unless the provider returns a real user result.
- Supabase bans do not invalidate already-issued access-token JWTs. Every protected application route/API must continue checking the authoritative account status; the current account context and agriculture/admin guards do so.
- No Supabase project exists yet, so provider behavior, migrations, real email delivery, browser/mobile accessibility and concurrent database tests remain staging release gates.
- State assignments are scopes only. They do not create visits, inspections, farmer assignments, evidence or completed field work.

## Verification

- Node structural/regression tests: `npm test`.
- TypeScript/TSX syntax parse: 169 files, no parse diagnostics in local check.
- Full dependency-backed Prisma validation, TypeScript typecheck and Next.js build must pass in GitHub CI on the exact Phase 04 commit before the phase is called CI-verified.
