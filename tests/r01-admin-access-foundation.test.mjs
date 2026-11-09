import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync,readdirSync} from "node:fs";
import path from "node:path";

const read=p=>readFileSync(p,"utf8");
function sourceFiles(dir,suffix){
 return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?sourceFiles(full,suffix):entry.isFile()&&full.endsWith(suffix)?[full.replaceAll("\\","/")]:[];
 });
}

test("all current and future admin pages inherit a server-derived Super Admin layout guard",()=>{
 const layout=read("src/app/admin/layout.tsx");
 const guard=read("src/server/admin/guard.ts");
 assert.match(layout,/await requireSuperAdminPage\(\)/);
 assert.match(layout,/export const dynamic="force-dynamic"/);
 assert.match(guard,/ctx\.account\.role!=="SUPER_ADMIN"/);
 assert.match(guard,/ctx\.account\.status!=="ACTIVE"/);
 assert.match(guard,/!ctx\.user\.email_confirmed_at/);
 const pages=sourceFiles("src/app/admin","/page.tsx");
 assert.ok(pages.length>=18,"Admin page inventory unexpectedly shrank");
 for(const page of pages){
  const source=read(page);
  if(page==="src/app/admin/staff/new/page.tsx"){
   assert.match(source,/redirect\("\/admin\/staff\/invite"\)/,page);
  }else if(page==="src/app/admin/account/page.tsx"){
   assert.match(source,/<AuthPage route="\/admin\/account"/,page);
   const wrapper=read("src/features/auth/components/auth-page.tsx");
   assert.match(wrapper,/mayAccess\(ctx,route\)/);
  }else{
   assert.match(source,/requireSuperAdminPage\(\)/,page+" must keep its independent page guard");
  }
 }
});

test("sensitive Admin review screens remain read-only unless authorized service actions execute",()=>{
 for(const page of [
  "src/app/admin/quotes/page.tsx",
  "src/app/admin/payments/refunds/page.tsx",
  "src/app/admin/settlements/page.tsx"
 ]){
  const source=read(page);
  assert.match(source,/await requireSuperAdminPage\(\)/,page);
  assert.match(source,/<DashboardFrame role="SUPER_ADMIN"/,page);
  assert.doesNotMatch(source,/requirePortal\("OPERATIONS"\)|<PortalFrame role="OPERATIONS"/,page);
 }
 const permissions=read("src/app/admin/permissions/page.tsx");
 assert.match(permissions,/not the final Admin specification/);
 assert.match(permissions,/Departmental role templates, individual grants and restrictions, privileged MFA/);
 assert.match(permissions,/Current installed access templates are fixed/);
});

const directGuardPaths=[
 "src/app/api/admin/audit/route.ts",
 "src/app/api/admin/staff/[id]/assignments/route.ts",
 "src/app/api/admin/staff/[id]/auth-sync/route.ts",
 "src/app/api/admin/staff/[id]/role/route.ts",
 "src/app/api/admin/staff/[id]/route.ts",
 "src/app/api/admin/staff/[id]/status/route.ts",
 "src/app/api/admin/staff/invitations/[id]/route.ts",
 "src/app/api/admin/staff/invitations/route.ts",
 "src/app/api/admin/staff/invite/route.ts",
 "src/app/api/admin/staff/route.ts"
];
const delegated={
 "src/app/api/admin/governance/incidents/[id]/assign/route.ts":["assignGovernanceIncident","src/server/admin/governance.ts","requireAdminApi(\"platform.governance.manage\")"],
 "src/app/api/admin/governance/incidents/[id]/transition/route.ts":["transitionGovernanceIncident","src/server/admin/governance.ts","requireAdminApi(\"platform.governance.manage\")"],
 "src/app/api/admin/governance/incidents/route.ts":["openGovernanceIncident","src/server/admin/governance.ts","requireAdminApi(\"platform.governance.manage\")"],
 "src/app/api/admin/payments/refunds/[id]/review/route.ts":["reviewRefundCase","src/server/payments/refunds.ts","account.role!==\"SUPER_ADMIN\""],
 "src/app/api/admin/reports/export/route.ts":["getPlatformReport","src/server/admin/reporting.ts","requireAdminApi(\"platform.reports.read\")"],
 "src/app/api/admin/settlements/[id]/approve/route.ts":["approveSupplierObligation","src/server/settlements/approval.ts","superAdminActor()"],
 "src/app/api/admin/settlements/attempts/[id]/reconcile/route.ts":["adminReconcileTransfer","src/server/settlements/reconciliation.ts","superAdminActor()"]
};
// R01.3D.2: separately reviewed, server-owned TOTP pilot. It does not use
// requireAdminApi("staff.manage") because personal MFA enrollment is not a
// staff-management grant and must not silently expand administrative powers.
const mfaPilotPaths=[
 "src/app/api/admin/security/mfa/[action]/route.ts"
];
const expected=new Set([...directGuardPaths,...Object.keys(delegated),...mfaPilotPaths]);

test("every Admin API route has an explicit documented guard or audited service delegation",()=>{
 const actual=sourceFiles("src/app/api/admin","/route.ts");
 assert.deepEqual(actual.sort(),[...expected].sort(),
  "New Admin API routes require a security review before being considered authorized");
 for(const path of directGuardPaths){
  assert.ok(existsSync(path),path);
  const src=read(path);
  if(path.endsWith("/staff/invite/route.ts")){
   assert.match(src,/ctx\.account\.role!=="SUPER_ADMIN"/,path);
   assert.match(src,/ctx\.account\.status!=="ACTIVE"/,path);
   assert.match(src,/!ctx\.user\.email_confirmed_at/,path);
  }else assert.match(src,/requireAdminApi\(/,path);
 }
 for(const path of mfaPilotPaths){
  assert.ok(existsSync(path),path);
  const route=read(path);
  assert.match(route,/getAccountContext\(\)/,path);
  assert.match(route,/ctx\.account\.role !== "SUPER_ADMIN"/,path);
  assert.match(route,/ctx\.account\.status !== "ACTIVE"/,path);
  assert.match(route,/!ctx\.user\.email_confirmed_at/,path);
  assert.match(route,/privilegedMfaPilotEnabled\(\)/,path);
  assert.match(route,/assertSameOrigin\(request\)/,path);
  assert.match(route,/verifyCurrentPassword\(/,path);
  assert.match(route,/ownTotpFactor\(/,path);
  assert.doesNotMatch(route,/createSupabaseAdminClient|SUPABASE_SECRET_KEY|PAYSTACK_SECRET_KEY/);
 }
 for(const [path,[action,service,check]] of Object.entries(delegated)){
  assert.ok(existsSync(service),service);
  assert.ok(read(path).includes(action+"("),path+" must invoke audited service");
  assert.ok(read(service).includes(check),service+" must enforce auth");
 }
});

test("existing role templates remain fail-closed and do not silently grant new financial access",()=>{
 const permission=read("src/server/admin/permissions.ts");
 assert.match(permission,/STAFF_ROLES = \["FIELD_AGENT", "OPERATIONS"\]/);
 assert.doesNotMatch(permission,/FINANCE_OFFICER|CONTENT_EDITOR|SUPPORT_OFFICER/);
 const approval=read("src/server/settlements/approval.ts");
 assert.match(approval,/await superAdminActor\(\)/);
 assert.match(approval,/agreement\.proposedById===account\.id/);
 const privateTokens=["SUPABASE_SECRET_KEY","PAYSTACK_SECRET_KEY","DATABASE_URL"];
 const layout=read("src/app/admin/layout.tsx");
 for(const token of privateTokens)assert.ok(!layout.includes(token),"Admin layout should not expose "+token);
});
