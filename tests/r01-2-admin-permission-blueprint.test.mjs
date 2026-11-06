import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import path from "node:path";

const read=path=>readFileSync(path,"utf8");
const blueprint=read("src/server/admin/target-access-blueprint.ts");
const page=read("src/app/admin/permissions/page.tsx");
const permissions=read("src/server/admin/permissions.ts");
const guard=read("src/server/admin/guard.ts");
const gates=JSON.parse(read("docs/implementation/r00-gates.json"));
const between=(a,b)=>{const start=blueprint.indexOf(a),end=blueprint.indexOf(b,start+1);assert.ok(start>=0&&end>start,a);return blueprint.slice(start,end)};
const roles=between("export const TARGET_ADMIN_ROLE_TEMPLATES","export const TARGET_ADMIN_ACTIONS");
const actions=between("export const TARGET_ADMIN_ACTIONS","export const TARGET_ADMIN_MODULE_GROUPS");
const groups=between("export const TARGET_ADMIN_MODULE_GROUPS","export const ADMIN_ACCESS_MISSING_CONTROLS");
const blockers=between("export const ADMIN_ACCESS_MISSING_CONTROLS","export const TARGET_ADMIN_BLUEPRINT");

test("R01.2 catalogues eight source-defined staff templates, without inventing account roles",()=>{
 for(const title of [
  "Super Admin","Operations Officer","Field Agent","Sourcing Officer",
  "Fulfilment / Logistics Officer","Finance Officer",
  "Support / Communications Officer","Content Editor"
 ])assert.ok(roles.includes('title:"'+title+'"'),title);
 assert.equal([...roles.matchAll(/\{id:"/g)].length,8);
 assert.equal([...roles.matchAll(/state:"PARTIAL"/g)].length,3);
 assert.equal([...roles.matchAll(/state:"NOT_IMPLEMENTED"/g)].length,5);
 for(const current of ["SUPER_ADMIN","OPERATIONS","FIELD_AGENT"])
  assert.ok(roles.includes('current:"'+current+'"'));
 const schema=read("prisma/schema.prisma");
 for(const role of ["BUYER","FARMER","FIELD_AGENT","OPERATIONS","SUPER_ADMIN"])
  assert.match(schema,new RegExp("\\b"+role+"\\b"));
 assert.doesNotMatch(schema,/enum AccountRole\s*\{[^}]*FINANCE_OFFICER/s);
});

test("permission vocabulary, 12 administrative groups and release blockers match client specifications",()=>{
 for(const verb of ["view","create","edit","approve","delete","export","manage"])
  assert.ok(actions.includes('id:"'+verb+'"'),verb);
 assert.equal([...actions.matchAll(/\{id:"/g)].length,7);
 for(const group of [
  "Overview","Farmers & Buyers","Field Operations","Products & Supply",
  "Sourcing & Quotes","Orders & Fulfilment","Finance","Support & Disputes",
  "Content & Communications","Reports & Audit","Team & Access","System Settings"
 ])assert.ok(groups.includes('label:"'+group+'"'),group);
 assert.equal([...groups.matchAll(/\{id:"/g)].length,12);
 for(const gate of ["R00-D01","R00-D04","R00-D09"]){
  assert.ok(blockers.includes('gate:"'+gate+'"'),gate);
  assert.equal(gates.gates.find(g=>g.id===gate)?.status,"PENDING_OWNER_DECISION");
 }
});

test("target blueprint is non-executable, server-only and never treated as an authorization source",()=>{
 assert.match(blueprint,/import "server-only"/);
 assert.match(blueprint,/NON_EXECUTABLE_REQUIREMENTS_CATALOGUE/);
 assert.match(blueprint,/implementedGrants:false/);
 assert.match(blueprint,/effectivePermissionsAvailable:false/);
 assert.doesNotMatch(blueprint,/hasPermission\(|permissionsForRole\(|getPrisma\(|account\.update|authorization:Bearer|fetch\(/);
 assert.doesNotMatch(permissions,/target-access-blueprint/);
 assert.doesNotMatch(guard,/target-access-blueprint/);
 assert.match(permissions,/export function hasPermission\(/);
 assert.match(guard,/hasPermission\(ctx\.account\.role,permission\)/);
 assert.match(guard,/ctx\.account\.status!=="ACTIVE"/);
 assert.match(guard,/!ctx\.user\.email_confirmed_at/);
});

test("Admin UI clearly labels active fixed permissions versus not-provisioned future templates",()=>{
 assert.match(page,/await requireSuperAdminPage\(\)/);
 assert.match(page,/PERMISSION_DETAILS\.map/);
 assert.match(page,/hasPermission\(role,row\.permission\)/);
 assert.match(page,/TARGET_ADMIN_BLUEPRINT\.roles\.map/);
 assert.match(page,/TARGET_ADMIN_BLUEPRINT\.actions\.map/);
 assert.match(page,/TARGET_ADMIN_BLUEPRINT\.moduleGroups\.map/);
 assert.match(page,/TARGET_ADMIN_BLUEPRINT\.missingControls\.map/);
 assert.match(page,/NOT AN ACTIVE GRANT SYSTEM/);
 assert.match(page,/No new access rights, individual overrides, MFA enforcement or financial approval authority/);
 assert.match(page,/None — not provisioned/);
 assert.doesNotMatch(page,/<form\b|onSubmit=|onClick=|type="submit"/);
 const stylesheet=read("src/styles/admin-access-blueprint.css");
 const global=read("src/app/globals.css");
 assert.match(global,/@import "\.\.\/styles\/admin-access-blueprint\.css"/);
 assert.match(stylesheet,/var\(--font-satoshi\)/);
 assert.match(stylesheet,/@media\(max-width:700px\)/);
 assert.match(stylesheet,/@media\(max-width:390px\)/);
});

test("catalogue cannot claim Admin completion or approve disputed policies",()=>{
 const doc=read("docs/implementation/R01_2_PERMISSION_BLUEPRINT.md");
 assert.match(doc,/not an implemented role grant/i);
 assert.match(doc,/R00-D01/);
 assert.match(doc,/R00-D04/);
 assert.match(doc,/R00-D09/);
 assert.match(doc,/financial authority/i);
 assert.match(doc,/mandatory MFA/i);
});

test("target blueprint is imported only by the read-only Admin permissions page",()=>{
 function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const file=path.join(dir,e.name);return e.isDirectory()?walk(file):e.isFile()&&/\\.(?:ts|tsx)$/.test(e.name)?[file]:[];
 });}
 const imports=walk("src").filter(file=>file!=="src/server/admin/target-access-blueprint.ts"&&read(file).includes('from "@/server/admin/target-access-blueprint"'));
 assert.deepEqual(imports,["src/app/admin/permissions/page.tsx"],"The blueprint cannot enter any API, guard, server action or auth workflow");
});
