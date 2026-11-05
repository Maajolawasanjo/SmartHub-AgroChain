import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=(p)=>readFileSync(p,"utf8");
const schema=read("prisma/schema.prisma");
const sql=read("prisma/migrations/20261104100000_admin_governance/migration.sql");
const governance=read("src/server/admin/governance.ts");
const report=read("src/server/admin/reporting.ts");
const permissions=read("src/server/admin/permissions.ts");
test("Phase 16 has true Super Admin-only incident models, migration and routes",()=>{
 for(const model of ["GovernanceIncident","GovernanceIncidentEvent"])
  assert.ok(schema.includes("model "+model+" {"),model);
 for(const path of [
  "src/app/admin/governance/page.tsx","src/app/admin/governance/[id]/page.tsx",
  "src/app/admin/reports/page.tsx","src/app/admin/users/page.tsx","src/app/admin/users/[id]/page.tsx",
  "src/app/admin/settings/page.tsx","src/app/api/admin/governance/incidents/route.ts",
  "src/app/api/admin/governance/incidents/[id]/transition/route.ts",
  "src/app/api/admin/governance/incidents/[id]/assign/route.ts",
  "src/app/api/admin/reports/export/route.ts"
 ])assert.ok(existsSync(path),path);
});
test("new governance tables are RLS-enabled and inaccessible through public Data API",()=>{
 for(const table of ["governance_incidents","governance_incident_events"])
  assert.ok(sql.includes('ALTER TABLE "'+table+'" ENABLE ROW LEVEL SECURITY'),table);
 assert.match(sql,/FROM anon, authenticated/);
 assert.match(sql,/REVOKE ALL ON TABLE/);
 assert.match(sql,/governance_incidents_clientKey_key/);
 assert.match(sql,/governance_incidents_subject_pair/);
});
test("Operations cannot grant governance or financial reporting permissions",()=>{
 assert.match(permissions,/"platform.reports.read"/);
 assert.match(permissions,/"platform.governance.manage"/);
 const p=permissions.match(/OPERATIONS:\s*\[([^\]]*)\]/);
 assert.ok(p);
 assert.doesNotMatch(p[1],/platform\.governance\.manage|platform\.reports\.read/);
 const admin=permissions.match(/SUPER_ADMIN:\s*\[([^\]]*)\]/);
 assert.ok(admin);
 assert.match(admin[1],/platform\.governance\.manage/);
 assert.match(admin[1],/platform\.reports\.read/);
 assert.match(governance,/requireAdminApi\("platform.governance.manage"\)/);
 assert.match(governance,/actor\?\.role!=="SUPER_ADMIN"/);
 assert.match(governance,/actor\.status!=="ACTIVE"/);
});
test("incident transitions use serializable row locks, optimistic versions and reason coded append-only events",()=>{
 assert.match(governance,/TransactionIsolationLevel\.Serializable/);
 assert.match(governance,/FOR UPDATE/);
 assert.match(governance,/incident\.version!==value\.expectedVersion/);
 assert.match(governance,/tx\.governanceIncidentEvent\.create/);
 assert.match(governance,/tx\.auditEvent\.create/);
 assert.match(governance,/OPEN:\["INVESTIGATING"\]/);
 assert.match(governance,/MITIGATED:\["CLOSED","INVESTIGATING"\]/);
 assert.match(governance,/CLOSED:\["OPEN"\]/);
 assert.match(governance,/state|reasonCode/);
 assert.match(governance,/if\(assignee\?\.role!=="SUPER_ADMIN"/);
 assert.match(governance,/clientKey:value\.clientKey/);
});
test("linked incidents require existing source records and cannot directly alter provider or stock status",()=>{
 for(const term of ["tx.account.findUnique","tx.order.findUnique","tx.paymentObligation.findUnique","tx.supplierObligation.findUnique","tx.shipment.findUnique","tx.supportCase.findUnique"])
  assert.ok(governance.includes(term),term);
 assert.doesNotMatch(governance,/tx\.paymentObligation\.update|tx\.supplierObligation\.update|tx\.order\.update|tx\.reservation\.update|tx\.account\.update/);
 assert.match(governance,/GOVERNANCE_STATUS_CHANGED/);
 assert.match(governance,/GOVERNANCE_INCIDENT_ASSIGNED/);
});
test("reports only use provider independently verified buyer money and settled supplier transfers",()=>{
 assert.match(report,/requireAdminApi\("platform.reports.read"\)/);
 assert.match(report,/status:"PAID",verifiedAt:recent/);
 assert.match(report,/supplier_settlement_attempts/);
 assert.match(report,/VERIFIED/);
 assert.ok(report.includes("SETTLED")&&report.includes("supplier_settlement_attempts"));
 assert.match(report,/amountMinor/);
 assert.match(report,/paymentObligation.count\(\{where:\{status:"REVIEW_REQUIRED"\}\}/);
 assert.match(report,/supplierObligation.count\(\{where:\{status:"REVIEW_REQUIRED"\}\}/);
 assert.match(report,/deliveryIssue.count/);
 assert.doesNotMatch(report,/Math\.random|mock|faker/);
});
test("aggregate export rejects arbitrary date windows, is protected and does not export names or bank details",()=>{
 const route=read("src/app/api/admin/reports/export/route.ts");
 assert.match(report,/z\.enum\(\["7","30","90"\]\)/);
 assert.match(route,/getPlatformReport\(days\)/);
 assert.match(route,/Cache-Control":"private, no-store"/);
 assert.match(route,/text\/csv/);
 assert.match(report,/reportCsv/);
 assert.match(report,/value\.replaceAll\('"','""'\)/);
 assert.doesNotMatch(report,/accountNumber|recipientEncryptedNumber|payerEmail/);
});
test("customer directory is read-only, scoped to real buyer and farmer identities, and never elevates roles",()=>{
 const index=read("src/app/admin/users/page.tsx");
 const detail=read("src/app/admin/users/[id]/page.tsx");
 assert.match(index,/requireSuperAdminPage\(\)/);
 assert.match(index,/role:role\?\?\{in:\["BUYER","FARMER"\]\}/);
 assert.match(detail,/requireSuperAdminPage\(\)/);
 assert.match(detail,/notFound\(\)/);
 assert.doesNotMatch(index+detail,/db\.account\.update\(|db\.account\.updateMany\(|createUser\(|signUp\(|inviteStaff\(/);
});
test("configuration is server read only, never leaks secret keys or permits bypassing payment gates",()=>{
 const conf=read("src/app/admin/settings/page.tsx");
 assert.match(conf,/requireSuperAdminPage\(\)/);
 assert.match(conf,/operationalFlags/);
 assert.match(report,/process\.env\.PAYMENTS_ENABLED==="true"/);
 assert.match(report,/process\.env\.SUPPLIER_PAYOUTS_ENABLED==="true"/);
 assert.doesNotMatch(conf,/PAYSTACK_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
 assert.doesNotMatch(conf,/onClick|method="post"|action="\x2fapi/);
});
test("Super Admin dashboard and navigation link to implemented governance reporting and directory",()=>{
 const nav=read("src/components/dashboard/navigation.ts");
 const home=read("src/app/admin/page.tsx");
 for(const path of ["/admin/reports","/admin/governance","/admin/users","/admin/settings"]){
  assert.match(nav,new RegExp('active\\([^\\n]*"'+path.replaceAll("/","\\/")+'"'));
  assert.ok(home.includes(path),path);
 }
 assert.match(home,/governanceIncident\.count/);
 assert.match(home,/paymentObligation\.count/);
});
