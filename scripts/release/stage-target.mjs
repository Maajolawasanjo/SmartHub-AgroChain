import assert from "node:assert/strict";

// Every live staging check is deliberately opt-in and rejects obvious production targets.
// This file never logs connection strings, cookies, Paystack credentials or auth secrets.
export function assertStageTarget(){
 assert.equal(process.env.RELEASE_STAGE_CONFIRM,"I_ACKNOWLEDGE_STAGING_ONLY",
  "Staging acceptance requires explicit RELEASE_STAGE_CONFIRM authorization.");
 const ref=process.env.SMART_HUB_STAGE_SUPABASE_REF??"";
 assert.match(ref,/^[a-z0-9]{20}$/,"Provide the exact dedicated SmartHub STAGING Supabase project ref.");
 const publicUrl=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??"http://invalid");
 assert.equal(publicUrl.protocol,"https:","The public Supabase endpoint must use HTTPS.");
 assert.equal(publicUrl.hostname,ref+".supabase.co","Supabase public origin must match the reviewed staging project.");
 const direct=new URL(process.env.DIRECT_URL??"http://invalid");
 assert.equal(direct.protocol,"postgresql:","Direct migration connection must use postgresql://");
 assert.equal(direct.hostname,"db."+ref+".supabase.co",
  "Direct database hostname must match the EXACT reviewed staging Supabase project.");
 assert.notEqual(direct.port,"6543","Do not migrate via the transaction pooler.");
 const runtimeDb=new URL(process.env.DATABASE_URL??"http://invalid");
 assert.equal(runtimeDb.protocol,"postgresql:","Runtime PostgreSQL URL must use postgresql://");
 const runtimeMatches=runtimeDb.hostname==="db."+ref+".supabase.co"||
   (/pooler\.supabase\.com$/.test(runtimeDb.hostname)&&runtimeDb.username.endsWith("."+ref));
 assert.ok(runtimeMatches,"Runtime database must resolve to the same reviewed staging project.");
 const base=new URL(process.env.STAGING_BASE_URL??"http://invalid");
 assert.equal(base.protocol,"https:","The staging application must use HTTPS.");
 assert.equal(base.username,"","Staging origin must not contain embedded credentials.");
 assert.equal(base.password,"","Staging origin must not contain embedded credentials.");
 assert.equal(base.pathname,"/","Staging origin must not include a path.");
 assert.equal(base.search,"","Staging origin cannot have query parameters.");
 assert.equal(base.hash,"","Staging origin cannot have fragments.");
 assert.match(base.hostname,/staging|preview|git-/i,
  "Staging deployment hostname must explicitly identify staging/preview, not a production hostname.");
 assert.equal(process.env.STAGING_REVIEWED_ORIGIN,base.origin,
  "Staging origin must exactly match the separately reviewed origin.");
 if(process.env.PRODUCTION_BASE_URL){
  assert.notEqual(base.origin,new URL(process.env.PRODUCTION_BASE_URL).origin,
   "The staging origin is identical to production. Refusing checks.");
 }
 assert.notEqual(process.env.SUPPLIER_PAYOUTS_ENABLED,"true",
  "Supplier payouts must remain disabled during release acceptance.");
 const paystack=process.env.PAYSTACK_SECRET_KEY;
 if(paystack)assert.ok(paystack.startsWith("sk_test_"),
  "Never run staging acceptance with a live Paystack key.");
 assert.notEqual(process.env.PUBLIC_SIGNUP_ENABLED,"true",
  "Unrestricted public signup must remain disabled during restricted staging tests.");
 return {ref,baseUrl:base.origin,databaseUrl:process.env.DIRECT_URL};
}

export function ensureStageScriptEnvironment(){
 try{return assertStageTarget();}
 catch(error){
  console.error("STAGING TARGET REJECTED:",error instanceof Error?error.message:"invalid configuration");
  process.exitCode=1;
  return null;
 }
}
