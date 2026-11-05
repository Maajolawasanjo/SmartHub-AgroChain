import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {inspectEnvironment} from "../scripts/release/check-environment.mjs";

const stagingRef="abcdefghijklmnopqrst";
const productionRef="zyxwvutsrqponmlkjihg";
const connection=(ref,port,mode="transaction")=>{
 const user=mode==="direct"?"postgres":"postgres."+ref;
 const host=mode==="direct"?"db."+ref+".supabase.co":"aws-0-eu-west-1.pooler.supabase.com";
 return "postgresql://"+user+":encoded%23pass@"+host+":"+port+"/postgres?sslmode=require";
};
const production={
 SMART_HUB_PRODUCTION_SUPABASE_REF:productionRef,
 NEXT_PUBLIC_SUPABASE_URL:"https://"+productionRef+".supabase.co",
 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_test_only",
 SUPABASE_SECRET_KEY:"sb_secret_nonproduction_example",
 DATABASE_URL:connection(productionRef,6543),
 DIRECT_URL:connection(productionRef,5432,"session"),
 APP_BASE_URL:"https://smarthub.example",
 AUTH_RECOVERY_SECRET:"R".repeat(48),
 FARMER_BANK_ENCRYPTION_KEY:Buffer.alloc(32,42).toString("base64"),
 FIELD_EVIDENCE_BUCKET:"field-visit-evidence",
 SHIPMENT_EVIDENCE_BUCKET:"shipment-evidence",
 PUBLIC_SIGNUP_ENABLED:"false",
 PUBLIC_CONTACT_ENABLED:"false",
 PAYMENTS_ENABLED:"false",
 SUPPLIER_PAYOUTS_ENABLED:"false",
 RELEASE_ACCEPTANCE_ENABLED:"false"
};
const staging={
 ...production,
 SMART_HUB_STAGE_SUPABASE_REF:stagingRef,
 NEXT_PUBLIC_SUPABASE_URL:"https://"+stagingRef+".supabase.co",
 DATABASE_URL:connection(stagingRef,6543),
 DIRECT_URL:connection(stagingRef,5432,"session"),
 APP_BASE_URL:"https://preview-smarthub.example"
};
function assertRejected(patch,needle,{target="production",base=production}={}){
 const result=inspectEnvironment({...base,...patch},{target});
 assert.equal(result.ok,false,"Expected rejected config "+needle);
 assert.ok(result.errors.some(e=>e.includes(needle)),JSON.stringify(result.errors));
}
test("Configured Supabase project, transaction runtime pooler and session migration pooler pass without exposing secrets",()=>{
 const result=inspectEnvironment(production,{target:"production"});
 assert.equal(result.ok,true,JSON.stringify(result.errors));
 assert.equal(result.runtimeMode,"transaction");
 assert.equal(result.migrationMode,"session");
 assert.equal(result.ref,productionRef);
 assert.ok(!JSON.stringify(result).includes("encoded%23pass"));
 const stage=inspectEnvironment(staging,{target:"staging"});
 assert.equal(stage.ok,true,JSON.stringify(stage.errors));
});
test("Fail closed on absent configuration, unrelated Postgres provider and wrong Supabase projects",()=>{
 assertRejected({NEXT_PUBLIC_SUPABASE_URL:"https://unrelated-project.supabase.co"},"does not match");
 assertRejected({DATABASE_URL:"postgresql://postgres:x@ep-test.prisma-data.net:5432/postgres?sslmode=require"},"exact reviewed");
 assertRejected({DATABASE_URL:connection(stagingRef,6543)},"exact reviewed");
 assertRejected({DIRECT_URL:connection(stagingRef,5432,"session")},"exact reviewed");
 assertRejected({DIRECT_URL:connection(productionRef,6543)},"transaction-mode");
 assertRejected({SMART_HUB_PRODUCTION_SUPABASE_REF:""},"20-character");
 assertRejected({APP_BASE_URL:"http://smarthub.example"},"clean HTTPS origin");
 assertRejected({AUTH_RECOVERY_SECRET:"short"},"at least 32");
});
test("Reject unencoded reserved passwords, disabled TLS and wrong database target without revealing credentials",()=>{
 const secret="unsafe#unencoded";
 const url="postgresql://postgres."+productionRef+":"+secret+"@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require";
 const r=inspectEnvironment({...production,DATABASE_URL:url},{target:"production"});
 assert.equal(r.ok,false);
 assert.ok(!JSON.stringify(r).includes(secret));
 assertRejected({DIRECT_URL:connection(productionRef,5432,"session").replace("sslmode=require","sslmode=disable")},"sslmode=require");
 assertRejected({DATABASE_URL:connection(productionRef,6543).replace("/postgres?","/other?")},"postgres database");
 assertRejected({DIRECT_URL:connection(productionRef,5432,"session").replace("sslmode=require","foo=bar")},"TLS setting");
});
test("Require strict staging separation and fail when production credentials appear in stage",()=>{
 assertRejected({SMART_HUB_STAGE_SUPABASE_REF:productionRef},"MUST be different",{target:"staging",base:staging});
 assertRejected({SMART_HUB_PRODUCTION_SUPABASE_REF:""},"required to prove staging",{target:"staging",base:staging});
 assertRejected({APP_BASE_URL:"https://smarthub.example"},"Staging APP_BASE_URL",{target:"staging",base:staging});
 assertRejected({PAYSTACK_SECRET_KEY:"sk_live_test_fake"},"live Paystack",{target:"staging",base:staging});
});
test("Bootstrap forbids public signup, payouts, checkout and production acceptance endpoint",()=>{
 for(const key of ["PAYMENTS_ENABLED","SUPPLIER_PAYOUTS_ENABLED","PUBLIC_SIGNUP_ENABLED"])
  assertRejected({[key]:"true"},key);
 assertRejected({RELEASE_ACCEPTANCE_ENABLED:"true"},"readiness endpoint");
});
test("Contact gate requires Turnstile and HMAC; bank encryption key must be 32 bytes",()=>{
 assertRejected({PUBLIC_CONTACT_ENABLED:"true"},"Turnstile");
 assertRejected({FARMER_BANK_ENCRYPTION_KEY:Buffer.alloc(16).toString("base64")},"32-byte");
 const valid=inspectEnvironment({...production,PUBLIC_CONTACT_ENABLED:"true",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY:"1x00000000000000000000AA",
  TURNSTILE_SECRET_KEY:"fake-test-only",
  CONTACT_HASH_SECRET:"H".repeat(42)},{target:"production"});
 assert.equal(valid.ok,true,JSON.stringify(valid.errors));
});
test("Separate Vercel Postgres variables warn but never substitute for SmartHub's Supabase database",()=>{
 const r=inspectEnvironment({...production,POSTGRES_URL:"another-private-connection-placeholder"},{target:"production"});
 assert.equal(r.ok,true);
 assert.match(r.warnings.join(" "),/Additional POSTGRES_/);
 assert.ok(!JSON.stringify(r).includes("another-private-connection-placeholder"));
});
test("Prisma pool uses bounded pg adapter in BOTH development and production warm instances",()=>{
 const source=readFileSync("src/server/db/prisma.ts","utf8");
 assert.match(source,/singleton\.smarthubPrisma=client/);
 assert.match(source,/max:poolMaximum\(\)/);
 assert.match(source,/connectionTimeoutMillis:5000/);
 assert.doesNotMatch(source,/process\.env\.NODE_ENV !== "production"\) singleton/);
});
test("Environment checker is offline, secret-safe and wired into protected staging workflow",()=>{
 const source=readFileSync("scripts/release/check-environment.mjs","utf8");
 const workflow=readFileSync(".github/workflows/staging-acceptance.yml","utf8");
 assert.doesNotMatch(source,/\bfetch\(|\bexec\(|new pg\./);
 assert.match(workflow,/node scripts\/release\/check-environment\.mjs --staging/);
 assert.match(workflow,/SMART_HUB_STAGING_AUTH_RECOVERY_SECRET/);
 assert.match(workflow,/SMART_HUB_PRODUCTION_SUPABASE_REF/);
 assert.match(readFileSync(".env.example","utf8"),/SMART_HUB_DB_POOL_MAX=/);
});
