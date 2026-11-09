import assert from "node:assert/strict";
import {assertReviewedStagingProjectRefs} from "./reviewed-environment-boundary.mjs";

// Fail-closed, NO database access or migration until every staging boundary is
// validated. Never log raw Postgres URLs: they contain credentials.
// Migrations may use direct port 5432 (IPv6) or Supavisor session port 5432
// (IPv4); transaction-mode pooler port 6543 MUST NOT run Prisma migrations.
const poolerHost=/^[a-z0-9-]+\.pooler\.supabase\.com$/;
const sslModes=new Set(["require","verify-ca","verify-full"]);
function dbUrl(name,ref,{migration=false}={}){
 const raw=process.env[name];
 assert.ok(raw,name+" is required as a private environment secret.");
 let url;
 try{url=new URL(raw);}catch{throw new Error(name+" must be a valid PostgreSQL URL.");}
 assert.ok(["postgres:","postgresql:"].includes(url.protocol),name+" must use postgres(ql)://.");
 assert.ok(url.password&&url.password.length>0,name+" must contain a database password.");
 assert.equal(url.pathname,"/postgres",name+" must target the reviewed postgres database.");
 assert.ok(sslModes.has(url.searchParams.get("sslmode")),
  name+" must explicitly require TLS (sslmode=require or stronger).");
 const isDirect=url.hostname==="db."+ref+".supabase.co"&&url.username==="postgres"&&
  (url.port===""||url.port==="5432");
 const isSession=poolerHost.test(url.hostname)&&url.port==="5432"&&
  url.username==="postgres."+ref;
 const isTransaction=poolerHost.test(url.hostname)&&url.port==="6543"&&
  url.username==="postgres."+ref;
 assert.ok(isDirect||isSession||(!migration&&isTransaction),
  name+" host, username or port is not tied to the reviewed project/mode.");
 if(migration)assert.ok(isDirect||isSession,
  name+" must use a direct or session-mode port 5432, never transaction port 6543.");
 return {url,mode:isDirect?"direct":isSession?"session":"transaction"};
}
export function assertStageTarget(){
 assert.equal(process.env.RELEASE_STAGE_CONFIRM,"I_ACKNOWLEDGE_STAGING_ONLY",
  "Staging acceptance requires explicit RELEASE_STAGE_CONFIRM authorization.");
 const ref=process.env.SMART_HUB_STAGE_SUPABASE_REF??"";
 assert.match(ref,/^[a-z0-9]{20}$/,"Provide the reviewed STAGING Supabase project ref.");
 const prodRef=process.env.SMART_HUB_PRODUCTION_SUPABASE_REF??"";
 assert.match(prodRef,/^[a-z0-9]{20}$/,"Provide the independently reviewed PRODUCTION Supabase ref.");
 assertReviewedStagingProjectRefs(ref,prodRef);
 const publicUrl=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??"http://invalid");
 assert.equal(publicUrl.protocol,"https:","The public Supabase URL must use HTTPS.");
 assert.equal(publicUrl.hostname,ref+".supabase.co","The public Supabase host must match the reviewed staging project.");
 assert.equal(publicUrl.pathname,"/","Public Supabase URL cannot contain a path.");
 assert.ok(!publicUrl.username&&!publicUrl.password&&!publicUrl.search&&!publicUrl.hash,
  "Public Supabase URL must be a clean origin.");
 const direct=dbUrl("DIRECT_URL",ref,{migration:true});
 dbUrl("DATABASE_URL",ref);
 const base=new URL(process.env.STAGING_BASE_URL??"http://invalid");
 assert.equal(base.protocol,"https:","Staging app must use HTTPS.");
 assert.ok(!base.username&&!base.password,"Staging origin cannot contain credentials.");
 assert.equal(base.pathname,"/","Staging origin cannot contain a path.");
 assert.equal(base.search,"","Staging origin cannot contain a query.");
 assert.equal(base.hash,"","Staging origin cannot contain a fragment.");
 assert.match(base.hostname,/staging|preview|git-/i,
  "Staging deployment hostname must explicitly identify staging/preview.");
 assert.equal(process.env.STAGING_REVIEWED_ORIGIN,base.origin,
  "Staging origin must exactly match the separately reviewed origin.");
 const prod=process.env.PRODUCTION_BASE_URL??"";
 assert.ok(prod,"PRODUCTION_BASE_URL is required for independent origin comparison.");
 const prodOrigin=new URL(prod);
 assert.equal(prodOrigin.protocol,"https:","Production app origin must use HTTPS.");
 assert.notEqual(base.origin,prodOrigin.origin,"Staging and production app origins cannot be identical.");
 assert.notEqual(process.env.SUPPLIER_PAYOUTS_ENABLED,"true","No supplier payouts in staging.");
 const paystack=process.env.PAYSTACK_SECRET_KEY;
 if(paystack)assert.ok(paystack.startsWith("sk_test_"),"Never run staging with a live Paystack key.");
 assert.notEqual(process.env.PUBLIC_SIGNUP_ENABLED,"true","Unrestricted public signup must be disabled.");
 return {ref,baseUrl:base.origin,databaseUrl:process.env.DIRECT_URL,migrationConnection:direct.mode};
}
export function ensureStageScriptEnvironment(){
 try{return assertStageTarget();}
 catch(error){
  console.error("STAGING TARGET REJECTED:",error instanceof Error?error.message:"invalid configuration");
  process.exitCode=1;
  return null;
 }
}
