import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {auditIntegrationConfig} from "../scripts/release/audit-integration-config.mjs";
const ref="abcdefghijklmnopqrst",prod="zyxwvutsrqponmlkjihg";
const runtime="postgresql://postgres."+ref+":test_only@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require";
const migrations="postgresql://postgres."+ref+":test_only@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";
const env={
 NEXT_PUBLIC_SUPABASE_URL:"https://"+ref+".supabase.co",
 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_test_placeholder",
 SMART_HUB_STAGE_SUPABASE_REF:ref,
 SMART_HUB_PRODUCTION_SUPABASE_REF:prod,
 DATABASE_URL:runtime,
 DIRECT_URL:migrations,
 APP_BASE_URL:"https://staging-smarthub.example.org",
 AUTH_RECOVERY_SECRET:"R".repeat(48),
 CONTACT_HASH_SECRET:"C".repeat(48),
 SUPABASE_SECRET_KEY:"sb_secret_test_placeholder",
 FARMER_BANK_ENCRYPTION_KEY:"A".repeat(43)+"=",
 PUBLIC_SIGNUP_ENABLED:"false",PAYMENTS_ENABLED:"false",SUPPLIER_PAYOUTS_ENABLED:"false",
 PUBLIC_CONTACT_ENABLED:"false",
};
function expectRejected(patch,problem,mode="staging"){
 const result=auditIntegrationConfig({...env,...patch},mode);
 assert.equal(result.ok,false,"incorrect configuration must be rejected");
 assert.ok(result.errors.some(e=>e.includes(problem)),result.errors.join("; "));
 // Never emit even a test-only password in the summary.
 assert.doesNotMatch(JSON.stringify(result),/test_only|sb_secret_test_placeholder|R{48}|C{48}/);
}
test("Integration audit permits correctly isolated Supabase session migration and pooled Prisma runtime",()=>{
 const result=auditIntegrationConfig(env,"staging");
 assert.equal(result.ok,true,result.errors.join("; "));
 assert.ok(result.warnings.some(x=>x.includes("PUBLIC_CONTACT_ENABLED")));
 assert.ok(result.warnings.some(x=>x.includes("PAYSTACK_SECRET_KEY")));
 assert.ok(!JSON.stringify(result).includes("aws-0-"));
});
test("Production must explicitly name and use its separate project",()=>{
 const production={
  ...env,NEXT_PUBLIC_SUPABASE_URL:"https://"+prod+".supabase.co",
  DATABASE_URL:runtime.replaceAll(ref,prod),
  DIRECT_URL:migrations.replaceAll(ref,prod),
  APP_BASE_URL:"https://smarthub.example.org"
 };
 const result=auditIntegrationConfig(production,"production");
 assert.equal(result.ok,true,result.errors.join("; "));
 expectRejected({SMART_HUB_PRODUCTION_SUPABASE_REF:ref},"Supabase project isolation");
 expectRejected({NEXT_PUBLIC_SUPABASE_URL:"https://"+prod+".supabase.co"},"Supabase project isolation");
 expectRejected({SMART_HUB_PRODUCTION_SUPABASE_REF:prod},"Supabase project isolation","production");
});
test("Staging requires an explicitly reviewed matching staging project ref",()=>{
 expectRejected({SMART_HUB_STAGE_SUPABASE_REF:""},"SMART_HUB_STAGE_SUPABASE_REF");
 expectRejected({SMART_HUB_STAGE_SUPABASE_REF:prod},"Supabase project isolation");
 expectRejected({SMART_HUB_STAGE_SUPABASE_REF:"invalid"},"SMART_HUB_STAGE_SUPABASE_REF");
 expectRejected({SMART_HUB_STAGE_SUPABASE_REF:"12345678901234567890"},"Supabase project isolation");
});
test("Unrelated Prisma Postgres integration or wrong project cannot replace SmartHub DB",()=>{
 expectRejected({DATABASE_URL:"postgresql://user:secret@db.prisma.io:5432/postgres?sslmode=require"},"DATABASE_URL");
 expectRejected({DATABASE_URL:runtime.replaceAll(ref,prod)},"DATABASE_URL");
 expectRejected({DIRECT_URL:migrations.replaceAll(ref,prod)},"DIRECT_URL");
 expectRejected({DIRECT_URL:runtime},"DIRECT_URL");
 expectRejected({DATABASE_URL:migrations},"DATABASE_URL");
 expectRejected({DATABASE_URL:runtime.replace(":6543",":5432")},"DATABASE_URL");
});
test("Both DB URLs must use TLS and expected ports without leaking values",()=>{
 expectRejected({DATABASE_URL:runtime.replace("&sslmode=require","")},"DATABASE_URL");
 expectRejected({DIRECT_URL:migrations.replace("?sslmode=require","")},"DIRECT_URL");
 expectRejected({DIRECT_URL:migrations.replace(":5432",":6543")},"DIRECT_URL");
 expectRejected({DATABASE_URL:""},"DATABASE_URL");
 expectRejected({DIRECT_URL:""},"DIRECT_URL");
});
test("Missing security secrets, unsafe launch toggles and invalid origins fail closed",()=>{
 expectRejected({AUTH_RECOVERY_SECRET:"short"},"AUTH_RECOVERY_SECRET");
 expectRejected({SUPABASE_SECRET_KEY:"sb_publishable_unsafe"},"SUPABASE_SECRET_KEY");
 expectRejected({CONTACT_HASH_SECRET:""},"CONTACT_HASH_SECRET");
 expectRejected({FARMER_BANK_ENCRYPTION_KEY:""},"FARMER_BANK_ENCRYPTION_KEY");
 expectRejected({PUBLIC_SIGNUP_ENABLED:"true"},"PUBLIC_SIGNUP_ENABLED");
 expectRejected({PAYMENTS_ENABLED:"true"},"PAYMENTS_ENABLED");
 expectRejected({SUPPLIER_PAYOUTS_ENABLED:"true"},"SUPPLIER_PAYOUTS_ENABLED");
 expectRejected({APP_BASE_URL:"http://localhost:3000"},"APP_BASE_URL");
 expectRejected({PUBLIC_CONTACT_ENABLED:"true"},"PUBLIC_CONTACT_ENABLED");
});
test("Staging workflow must validate separate production reference BEFORE migration",()=>{
 const wf=readFileSync(".github/workflows/staging-acceptance.yml","utf8");
 const guard=readFileSync("scripts/release/stage-target.mjs","utf8");
 assert.match(wf,/SMART_HUB_PRODUCTION_SUPABASE_REF:/);
 assert.match(wf,/Reject wrong database and any non-staging deployment BEFORE migration/);
 assert.match(guard,/SMART_HUB_PRODUCTION_SUPABASE_REF/);
 assert.match(guard,/session-mode port 5432/);
 assert.match(guard,/sslmode=require/);
 assert.ok(guard.includes("assertReviewedStagingProjectRefs(ref,prodRef)"));
 assert.ok(guard.includes("reviewed-environment-boundary.mjs"));
 assert.ok(readFileSync("scripts/release/reviewed-environment-boundary.mjs","utf8").includes("assert.notEqual(stageRef,REVIEWED_PRODUCTION_SUPABASE_REF"));
 assert.doesNotMatch(guard,/console\.log\(.*DATABASE_URL/);
});
