import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";


const read=path=>readFileSync(path,"utf8");
const permissions=read("src/server/admin/permissions.ts");
const guard=read("src/server/admin/guard.ts");
const page=read("src/app/admin/access-review/page.tsx");
const navigation=read("src/components/dashboard/navigation.ts");
const admin=read("src/app/admin/page.tsx");
const details=read("src/app/admin/permissions/page.tsx");

test("Admin APIs accept only the declared internal administrative capability prefixes",()=>{
 const permitted=["operations.","staff.","permissions.","platform."];
 for(const prefix of permitted)assert.ok(permissions.includes('permission.startsWith("'+prefix+'")'),"Missing runtime check for "+prefix);
 assert.equal(permissions.split("permission.startsWith(").length-1,4,"No unexpected Admin namespace prefix");
 assert.deepEqual(permitted,["operations.","staff.","permissions.","platform."]);
 assert.ok(permissions.includes("PERMISSIONS.includes(permission as Permission)"),"Admin gate must still require a declared capability");
 assert.match(permissions,/typeof permission==="string"/);
 assert.match(permissions,/export type AdminApiPermission = Extract<Permission/);
 for(const outsider of ["buyer.request.create","farmer.supply.manage","field.assigned.read","field.visit.manage","field.evidence.submit"])
  assert.ok(permitted.every(prefix=>!outsider.startsWith(prefix)),outsider+" must never be a valid Admin permission");
 for(const internal of ["operations.requests.review","staff.invite","permissions.view","platform.reports.read"])
  assert.ok(permitted.some(prefix=>internal.startsWith(prefix)),internal);
 assert.match(permissions,/export function hasPermission/);
 assert.match(permissions,/export function permissionsForRole/);
});

test("Admin API guard rejects external/field-only roles and checks account and provider status",()=>{
 assert.match(permissions,/export type AdminApiPermission = Extract<Permission/);
 assert.match(guard,/requireAdminApi\(permission:AdminApiPermission="staff.manage"\)/);
 assert.match(guard,/\["SUPER_ADMIN","OPERATIONS"\]\.includes\(ctx\.account\.role\)/);
 assert.match(guard,/!isAdministrativePermission\(permission\)/);
 assert.match(guard,/!hasPermission\(ctx\.account\.role,permission\)/);
 assert.match(guard,/ctx\.account\.status!=="ACTIVE"/);
 assert.match(guard,/!ctx\.user\.email_confirmed_at/);
 assert.doesNotMatch(guard,/TARGET_ADMIN_BLUEPRINT|target-access-blueprint/);
});

test("real access review is Super Admin protected, filtered, paginated and read only",()=>{
 assert.match(page,/await requireSuperAdminPage\(\)/);
 assert.match(page,/export const dynamic="force-dynamic"/);
 assert.match(page,/db\.account\.groupBy/);
 assert.match(page,/db\.account\.count\(\{where\}\)/);
 assert.match(page,/db\.account\.findMany/);
 assert.match(page,/db\.staffInvitation\.count/);
 assert.match(page,/db\.fieldAgentAssignment\.count/);
 assert.match(page,/fieldAgentAssignments:\{where:\{active:true\}/);
 assert.match(page,/const pageSize=25/);
 assert.match(page,/skip:\(page-1\)\*pageSize,take:pageSize/);
 assert.match(page,/role:role\?\?\{in:\[\.\.\.trackedRoles\]\}/);
 assert.match(page,/permissionsForRole\(item\.role\)\.length/);
 assert.match(page,/not inspect each person's live Supabase session/i);
 assert.match(page,/not a certification that the person may perform sensitive actions/);
 assert.doesNotMatch(page,/db\.[A-Za-z]+\.(?:create|update|delete|upsert)\(|\$executeRaw|SUPABASE_SECRET_KEY|PAYSTACK_SECRET_KEY/);
 assert.doesNotMatch(page,/<(?:button[^>]+type="button"[^>]+onClick=)|role="checkbox"/);
});

test("Staff Access Review is navigable from admin home and permissions with no external role exposure",()=>{
 assert.match(navigation,/active\("Staff Access Review","\/admin\/access-review","users"\)/);
 assert.match(admin,/href="\/admin\/access-review"/);
 assert.match(details,/href="\/admin\/access-review"/);
 const prefix=navigation.indexOf(" SUPER_ADMIN:[");
 const tail=navigation.indexOf("\n ],",prefix);
 assert.ok(prefix>=0&&tail>prefix);
 assert.ok(navigation.slice(prefix,tail).includes("/admin/access-review"));
 for(const prefix of [" BUYER:["," FARMER:["," FIELD_AGENT:["," OPERATIONS:["]){
  const i=navigation.indexOf(prefix);
  assert.ok(i>=0);
  const j=navigation.indexOf("\n ],",i);
  assert.doesNotMatch(navigation.slice(i,j),/admin\/access-review/);
 }
});

test("R01.3 documentation retains separate architecture, MFA and finance approval release gates",()=>{
 const doc=read("docs/implementation/R01_3_ADMIN_ACCESS_REVIEW.md");
 for(const term of ["R00-D01","R00-D04","R00-D09","MFA","financial authority","not","production"])
  assert.ok(doc.includes(term),term);
 assert.match(doc,/No new account roles, permissions, individual grants, database migrations or financial approval rights/);
});
