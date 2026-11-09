import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {assertStageTarget} from "../scripts/release/stage-target.mjs";
const read=p=>readFileSync(p,"utf8");
const ref="abcdefghijklmnopqrst";
const prodRef="ematieqwxoiwoovmqdba";
const valid={
 RELEASE_STAGE_CONFIRM:"I_ACKNOWLEDGE_STAGING_ONLY",
 SMART_HUB_STAGE_SUPABASE_REF:ref,
 SMART_HUB_PRODUCTION_SUPABASE_REF:prodRef,
 NEXT_PUBLIC_SUPABASE_URL:"https://"+ref+".supabase.co",
 DIRECT_URL:"postgresql://postgres:example@db."+ref+".supabase.co:5432/postgres?sslmode=require",
 DATABASE_URL:"postgresql://postgres:example@db."+ref+".supabase.co:5432/postgres?sslmode=require",
 STAGING_BASE_URL:"https://staging.smarthub.example",
 STAGING_REVIEWED_ORIGIN:"https://staging.smarthub.example",
 PRODUCTION_BASE_URL:"https://smarthub.example",
 PAYMENTS_ENABLED:"false",SUPPLIER_PAYOUTS_ENABLED:"false",PUBLIC_SIGNUP_ENABLED:"false",
 PAYSTACK_SECRET_KEY:"sk_test_dummy_only"
};
function withEnv(overrides,fn){
 const keys=Object.keys(valid),prev=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 for(const key of keys){
  const v=Object.hasOwn(overrides,key)?overrides[key]:valid[key];
  if(v===null)delete process.env[key];
  else process.env[key]=v;
 }
 try{fn();}
 finally{for(const key of keys){
  if(prev[key]===undefined)delete process.env[key];
  else process.env[key]=prev[key];
 }}
}
test("Phase17 target verifier accepts only an explicit, correctly matched dedicated staging target",()=>{
 withEnv({},()=>assertStageTarget());
 for(const patch of [
  {RELEASE_STAGE_CONFIRM:""},
  {SMART_HUB_STAGE_SUPABASE_REF:""},
  {SMART_HUB_PRODUCTION_SUPABASE_REF:null},
  {SMART_HUB_PRODUCTION_SUPABASE_REF:ref},
  {NEXT_PUBLIC_SUPABASE_URL:"https://other-project.supabase.co"},
  {DIRECT_URL:"postgresql://postgres:secret@db.other-project.supabase.co/postgres"},
  {DATABASE_URL:"postgresql://postgres:secret@db.other-project.supabase.co/postgres"},
  {STAGING_BASE_URL:"https://smarthub.example"},
  {STAGING_REVIEWED_ORIGIN:"https://preview-other.example"},
  {PRODUCTION_BASE_URL:"https://staging.smarthub.example"},
  {PAYSTACK_SECRET_KEY:"sk_live_invalid"},
  {DIRECT_URL:"postgresql://postgres."+ref+":example@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"},
  {DIRECT_URL:"postgresql://postgres.otherprojectref1234:example@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"},
  {DIRECT_URL:"postgresql://postgres."+ref+":example@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"},
  {DATABASE_URL:"postgresql://postgres."+prodRef+":example@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"},
  {SUPPLIER_PAYOUTS_ENABLED:"true"},
  {PUBLIC_SIGNUP_ENABLED:"true"}
 ])withEnv(patch,()=>assert.throws(()=>assertStageTarget()));
 withEnv({DATABASE_URL:"postgresql://postgres."+ref+":secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"},()=>assertStageTarget());
 withEnv({DIRECT_URL:"postgresql://postgres."+ref+":secret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require",DATABASE_URL:"postgresql://postgres."+ref+":secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"},()=>{
  const result=assertStageTarget();
  assert.equal(result.migrationConnection,"session");
 });
});
test("Stage safety probes never start implicitly during repository tests and require explicit envs",()=>{
 const stage=read("scripts/release/check-stage-database.mjs");
 const roles=read("scripts/release/check-stage-http.mjs");
 assert.match(stage,/ensureStageScriptEnvironment\(\)/);
 assert.match(roles,/ensureStageScriptEnvironment\(\)/);
 assert.match(stage,/migration_name,checksum,finished_at,rolled_back_at/);
 assert.match(stage,/Migration checksum drift/);
 assert.match(stage,/relrowsecurity/);
 assert.match(stage,/has_table_privilege/);
 assert.match(stage,/storage\.buckets/);
 assert.match(stage,/lot conservation/);
 assert.match(stage,/settled supplier obligations without verified transfer/);
 assert.match(roles,/const names=\["BUYER_A","BUYER_B"/);
 assert.match(roles,/process\.env\["STAGING_SESSION_"\+k\]/);
 assert.match(roles,/STAGING_BUYER_A_SHIPMENT_ID/);
 assert.match(roles,/STAGING_BUYER_A_SUPPORT_CASE_ID/);
 assert.match(roles,/fetch\(url,\{method:"GET",redirect:"manual"/);
 assert.doesNotMatch(roles,/(?:method:"POST"|method:"PATCH"|method:"DELETE")/);
});
test("Controlled staging workflow is manual, environment-approved and protects migration from missing backup evidence",()=>{
 const workflow=read(".github/workflows/staging-acceptance.yml");
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/^\s+(?:pull_request|push):/m);
 assert.match(workflow,/environment: staging/);
 assert.match(workflow,/permissions:\s*\n\s*contents: read/);
 assert.match(workflow,/STAGING_BACKUP_RESTORE_EVIDENCE/);
 assert.match(workflow,/STAGING_MIGRATIONS_APPROVED/);
 assert.match(workflow,/inputs\.apply_migrations/);
 assert.match(workflow,/check-stage-database\.mjs/);
 assert.match(workflow,/check-stage-http\.mjs/);
 assert.match(workflow,/@playwright\/test@1\.64\.1/);
 assert.match(workflow,/staging\.acceptance\.spec\.mjs/);
 assert.match(workflow,/npm run db:migrate/);
});
test("Staging readiness probe is staging-only, authenticated, secret-independent and not indexed",()=>{
 const src=read("src/app/api/internal/readiness/route.ts");
 assert.match(src,/RELEASE_ACCEPTANCE_ENABLED!=="true"/);
 assert.match(src,/matchingSecret/);
 assert.match(src,/timingSafeEqual/);
 assert.match(src,/authConfigReady\(\)/);
 assert.match(src,/Cache-Control":"private, no-store"/);
 assert.doesNotMatch(src,/DATABASE_URL|DIRECT_URL|PAYSTACK_SECRET_KEY/);
});
test("Post-completion buyer complaints reopen delivery review and cannot silently release inventory",()=>{
 const report=read("src/server/fulfilment/receipts.ts");
 const schema=read("prisma/schema.prisma");
 const migration=read("prisma/migrations/20261105010000_release_delivery_review/migration.sql");
 assert.match(schema,/DELIVERY_REVIEW/);
 assert.match(migration,/ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERY_REVIEW'/);
 assert.match(report,/\["FULFILLING","COMPLETED"\]\.includes\(order\.status\)/);
 assert.match(report,/status:"DELIVERY_REVIEW"/);
 assert.match(report,/orderStatusEvent\.create/);
 assert.match(report,/eventKey:"shipment:dispute:"\+issue\.id/);
 assert.match(read("src/server/settlements/common.ts"),/order\.status!=="COMPLETED"/);
 assert.doesNotMatch(report,/kind:"RELEASED"/);
});
test("Provider disputes after a completed order freeze the financial state and allow review cases",()=>{
 const pay=read("src/server/payments/reconciliation.ts");
 const refunds=read("src/server/payments/refunds.ts");
 assert.match(pay,/\["PAYMENT_VERIFIED","FULFILLING","COMPLETED","DELIVERY_REVIEW"\]\.includes\(order\.status\)/);
 assert.match(pay,/status:"PAYMENT_REVIEW"/);
 assert.match(pay,/const repeatVerified=obligation\.status==="PAID"&&attempt\.status==="VERIFIED"&&\["PAYMENT_VERIFIED","FULFILLING","COMPLETED","DELIVERY_REVIEW"\]\.includes\(order\.status\)/);
 assert.match(refunds,/DELIVERY_REVIEW/);
 assert.match(refunds,/PAYMENT_REVIEW/);
});
test("Phase17 release checklist and commands are attached to the repository",()=>{
 for(const path of [
  "scripts/release/stage-target.mjs",
  "scripts/release/check-stage-database.mjs",
  "scripts/release/check-stage-http.mjs",
  ".github/workflows/staging-acceptance.yml",
  "docs/development/PHASE_17_RELEASE_ACCEPTANCE.md"
 ])assert.ok(existsSync(path),"missing "+path);
});

test("Staging guard never logs database connection credentials",()=>{
 const stage=read("scripts/release/stage-target.mjs");
 assert.ok(!stage.includes("console.log(process.env.DATABASE_URL"));
 assert.match(stage,/session-mode/);
 assert.match(stage,/SMART_HUB_PRODUCTION_SUPABASE_REF/);
 assert.match(stage,/sslmode=require/);
});
