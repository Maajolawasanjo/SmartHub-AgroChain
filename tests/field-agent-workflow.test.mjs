import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const s=path=>readFileSync(path,"utf8");

test("field-agent read and mutation routes use fixed permissions and account status",()=>{
 const guard=s("src/server/field-agent/guard.ts");
 assert.match(guard,/account\.status!=="ACTIVE"/);
 assert.match(guard,/hasPermission\(ctx\.account\.role,permission\)/);
 assert.match(guard,/field\.assigned\.read/);
 assert.match(s("src/server/admin/permissions.ts"),/field\.visit\.manage/);
 assert.match(s("src/server/admin/permissions.ts"),/field\.evidence\.submit/);
 for(const path of ["src/app/api/field-agent/farms/route.ts","src/app/api/field-agent/visits/route.ts","src/app/api/field-agent/visits/[id]/route.ts"]){
  assert.match(s(path),/requireFieldAgentApi/);
 }
});

test("field visit creation and every mutation re-check active state scope inside a locked transaction",()=>{
 const actions=s("src/server/field-agent/actions.ts");
 assert.match(actions,/SELECT "id" FROM "app_accounts"[\s\S]*FOR UPDATE/);
 assert.match(actions,/fieldAgentId:agentId,state:farm\.state,active:true/);
 assert.match(actions,/fieldAgentId:agentId,state:fullVisit\.farm\.state,active:true/);
 assert.match(actions,/status:existing\.status/);
 assert.match(actions,/SELECT "id" FROM "farms"[\s\S]*FOR UPDATE/);
 assert.match(actions,/status:"DRAFT"/);
 assert.match(actions,/status:"SUBMITTED"/);
});

test("field report submission requires notes and ready evidence; agent cannot approve verification",()=>{
 const actions=s("src/server/field-agent/actions.ts");
 assert.match(actions,/fieldNotes\.trim\(\)\.length<20/);
 assert.match(actions,/e\.status==="READY"/);
 assert.match(actions,/Attach at least one evidence file/);
 assert.match(actions,/You cannot review your own field report/);
 assert.doesNotMatch(actions,/farmerVerification\.update/);
 assert.doesNotMatch(actions,/supplyDeclaration\.update/);
});

test("private evidence has server-generated paths, file signature checks and short-lived signed reads",()=>{
 const evidence=s("src/server/field-agent/evidence.ts");
 assert.match(evidence,/MAX_FILE_BYTES=10\*1024\*1024/);
 assert.match(evidence,/file\.arrayBuffer\(\)/);
 assert.match(evidence,/randomUUID\(\)/);
 assert.match(evidence,/upsert:false/);
 assert.match(evidence,/createSignedUrl\(evidence\.objectPath,60,\{download:true\}\)/);
 const sql=s("prisma/migrations/20261104000000_field_agent_workflow/migration.sql");
 assert.match(sql,/VALUES \('field-visit-evidence','field-visit-evidence',FALSE/);
 assert.match(sql,/REVOKE ALL ON TABLE "field_visit_evidence" FROM anon, authenticated/);
 for(const table of ["field_visits","field_visit_evidence","field_visit_events"]){
  assert.match(sql,new RegExp(`ALTER TABLE \"${table}\" ENABLE ROW LEVEL SECURITY`));
  assert.match(sql,new RegExp(`REVOKE ALL ON TABLE \"${table}\" FROM anon, authenticated`));
 }
});

test("Operations review is separate from farmer/supply approval and records a reason",()=>{
 const actions=s("src/server/field-agent/actions.ts");
 assert.match(actions,/operations\.verification\.review/);
 assert.match(actions,/visit\.status!=="SUBMITTED"/);
 assert.match(actions,/reviewDecision:decision/);
 assert.match(actions,/reviewerNote:value\.note/);
 assert.match(actions,/FIELD_VISIT_REPORT_ACCEPTED/);
 assert.match(actions,/FIELD_VISIT_REPORT_RETURNED/);
 assert.match(s("src/app/operations/field-visits/[id]/page.tsx"),/does not itself change farmer or supply verification status/);
 assert.match(s("src/app/api/admin/audit/route.ts"),/startsWith:"FIELD_VISIT_"/);
 assert.match(s("src/components/dashboard/navigation.ts"),/active\("Field Visit Reports","\/operations\/field-visits"/);
});

test("Phase 05 route and migration inventory exists",()=>{
 for(const path of [
  "src/app/field-agent/farmers/page.tsx","src/app/field-agent/visits/page.tsx","src/app/field-agent/visits/new/page.tsx",
  "src/app/field-agent/visits/[id]/page.tsx","src/app/field-agent/reports/page.tsx","src/app/operations/field-visits/page.tsx",
  "src/app/operations/field-visits/[id]/page.tsx","prisma/migrations/20261104000000_field_agent_workflow/migration.sql",
  "docs/development/PHASE_05_FIELD_AGENT_WORKFLOW.md"]){assert.ok(existsSync(path),path);}
});
