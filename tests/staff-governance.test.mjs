import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
const read=path=>readFileSync(join(process.cwd(),path),"utf8");

test("staff admin pages are server-gated and the former placeholder routes now have real views",()=>{
 for(const path of ["src/app/admin/staff/page.tsx","src/app/admin/staff/invite/page.tsx","src/app/admin/staff/invites/page.tsx","src/app/admin/staff/[id]/page.tsx","src/app/admin/staff/[id]/roles/page.tsx","src/app/admin/staff/[id]/status/page.tsx","src/app/admin/staff/[id]/assignments/page.tsx","src/app/admin/staff/[id]/activity/page.tsx","src/app/admin/permissions/page.tsx","src/app/admin/audit/page.tsx"]){
  assert.ok(existsSync(path),path);assert.match(read(path),/requireSuperAdminPage/);
  assert.doesNotMatch(read(path),/AuthPage route=/,path);
 }
 assert.match(read("src/server/admin/guard.ts"),/ctx\.account\.role!=="SUPER_ADMIN"/);
 assert.match(read("src/server/admin/guard.ts"),/ctx\.account\.status!=="ACTIVE"/);
});

test("staff permissions are fixed server templates and invitations cannot create privileged roles",()=>{
 const permissions=read("src/server/admin/permissions.ts");
 assert.match(permissions,/Record<AccountRole, readonly Permission\[]>/);
 assert.match(permissions,/SUPER_ADMIN: \["operations\.verification\.review"/);
 assert.match(permissions,/permissionsForRole/);
 assert.match(permissions,/BUYER: \["buyer\.request\.create"\]/);
 assert.match(permissions,/STAFF_ROLES = \["FIELD_AGENT", "OPERATIONS"\]/);
 assert.doesNotMatch(permissions,/user_metadata/);
 const invite=read("src/app/api/admin/staff/invite/route.ts");
 assert.match(invite,/z\.enum\(STAFF_ROLES\)/);
 assert.match(invite,/verifyCurrentPassword/);
 assert.match(invite,/ctx\.account\.role!=="SUPER_ADMIN"/);
});

test("all staff mutation endpoints authorize server identity, check origin, and reauthenticate",()=>{
 for(const path of ["src/app/api/admin/staff/[id]/role/route.ts","src/app/api/admin/staff/[id]/status/route.ts","src/app/api/admin/staff/[id]/assignments/route.ts","src/app/api/admin/staff/[id]/auth-sync/route.ts","src/app/api/admin/staff/invitations/[id]/route.ts"]){
  const code=read(path);assert.match(code,/requireAdminApi\(/);assert.match(code,/assertSameOrigin\(/);assert.match(code,/verifyCurrentPassword\(/);assert.match(code,/readJson\(/);
 }
 assert.match(read("src/server/admin/guard.ts"),/hasPermission\(ctx\.account\.role,permission\)/);
});

test("role changes reject self and non-staff targets, use optimistic updates, and audit transition",()=>{
 const route=read("src/app/api/admin/staff/[id]/role/route.ts");
 assert.match(route,/id===ctx\.account\.id/);
 assert.match(route,/isStaffRole\(target\.role\)/);
 assert.match(route,/updateMany\(\{where:\{id,role:target\.role,status:"ACTIVE"\}/);
 assert.match(route,/previousRole:target\.role,newRole:input\.role/);
 assert.match(route,/action:"STAFF_ROLE_CHANGED"/);
 assert.match(route,/input\.role!=="FIELD_AGENT"/);
});

test("suspension and reinstatement require a reason, synchronize Supabase bans and preserve fail-closed DB status",()=>{
 const route=read("src/app/api/admin/staff/[id]/status/route.ts");
 assert.match(route,/reason:z\.string\(\)\.trim\(\)\.min\(8\)/);
 assert.match(route,/ban_duration:"876000h"/);
 assert.match(route,/ban_duration:"none"/);
 assert.match(route,/STAFF_SUSPENDED/);assert.match(route,/STAFF_REINSTATED/);
 assert.match(route,/deactivatedAssignments/);
 assert.match(route,/do not invalidate already-issued access tokens/);
 const sync=read("src/app/api/admin/staff/[id]/auth-sync/route.ts");assert.match(sync,/STAFF_AUTH_SYNCED/);assert.match(sync,/STAFF_AUTH_SYNC_FAILED/);assert.match(sync,/FOR UPDATE/);
});

test("Field Agent state scopes are canonical, unique, active-only and auditable",()=>{
 const route=read("src/app/api/admin/staff/[id]/assignments/route.ts");
 const schema=read("prisma/schema.prisma");const migration=read("prisma/migrations/20261103000000_staff_governance/migration.sql");
 assert.match(route,/z\.enum\(NIGERIA_STATES\)/);assert.match(route,/target\.role!=="FIELD_AGENT"/);assert.match(route,/target\.status!=="ACTIVE"/);
 assert.match(route,/FIELD_AGENT_STATE_ASSIGNED/);assert.match(route,/FIELD_AGENT_STATE_UNASSIGNED/);
 assert.match(schema,/model FieldAgentAssignment/);assert.match(schema,/@@unique\(\[fieldAgentId, state\]\)/);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);assert.match(migration,/REVOKE ALL ON TABLE "field_agent_assignments" FROM anon, authenticated/);assert.match(migration,/nigeria_state_check/);
});

test("invitation delivery failures are non-accepting and revocation is race-safe",()=>{
 const invite=read("src/app/api/admin/staff/invite/route.ts");const revoke=read("src/app/api/admin/staff/invitations/[id]/route.ts");const accept=read("src/app/api/auth/accept-invite/route.ts");
 assert.match(invite,/DELIVERY_FAILED/);assert.match(invite,/DELIVERY_UNCERTAIN/);assert.match(invite,/STAFF_INVITATION_DELIVERY_UNCERTAIN/);
 assert.match(revoke,/status!=="PENDING"/);assert.match(revoke,/expiresAt:\s*\{gt:new Date\(\)\}/);assert.match(revoke,/STAFF_INVITATION_REVOKED/);
 assert.match(accept,/status:"PENDING"/);assert.match(accept,/expiresAt:\{gt:new Date\(\)\}/);
 assert.match(read("prisma/schema.prisma"),/DELIVERY_FAILED/);assert.match(read("prisma/schema.prisma"),/DELIVERY_UNCERTAIN/);
});

test("invitation single-pending constraint and structured audit details are migrated",()=>{
 const migration=read("prisma/migrations/20261103000000_staff_governance/migration.sql");
 assert.match(migration,/staff_invitations_one_pending_email_key/);assert.match(migration,/lower\("email"\)/);
 assert.match(migration,/ALTER TABLE "auth_audit_events" ADD COLUMN "details" JSONB/);
 assert.match(read("prisma/schema.prisma"),/details\s+Json\?/);
});

test("Super Admin navigation exposes implemented staff governance pages",()=>{
 const nav=read("src/components/dashboard/navigation.ts");
 for(const item of ["Staff Directory","Invitations","Roles & Permissions","Platform Audit"])assert.ok(nav.includes(item),item);
 assert.match(nav,/active\("Staff Directory","\/admin\/staff"/);
 assert.match(nav,/active\("Roles & Permissions","\/admin\/permissions"/);
 assert.match(nav,/active\("Platform Audit","\/admin\/audit"/);
});

test("staff forms expose reauthentication, clear confirmation and responsive accessible controls",()=>{
 const forms=read("src/features/admin/staff/staff-forms.tsx");const css=read("src/app/globals.css");
 for(const label of ["Confirm your password","Reason for this change","Save state assignments","Revoke invitation"])assert.ok(forms.includes(label),label);
 assert.match(forms,/window\.confirm/);assert.match(forms,/role="alert"/);assert.match(forms,/role="status"/);
 assert.match(css,/\.staff-state-grid/);assert.match(css,/@media\(max-width:520px\)/);
});
