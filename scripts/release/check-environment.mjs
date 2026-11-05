import {pathToFileURL} from "node:url";

// A read-only deployment preflight. It NEVER opens a database connection, invokes
// a provider API, prints a password or modifies environment variables.
// Use a reviewed Supabase ref to prevent accidentally linking a Prisma Postgres,
// unrelated Supabase or Vercel Postgres database to the SmartHub application.
const allowedTls=new Set(["require","verify-ca","verify-full"]);
const pooler=/^[a-z0-9-]+\.pooler\.supabase\.com$/;
const refPattern=/^[a-z0-9]{20}$/;
const nonempty=x=>typeof x==="string"&&x.trim().length>0;
const validKey=(x,n)=>typeof x==="string"&&x.length>=n;
function origin(value,label,errors){
 if(!nonempty(value)){errors.push(label+" is missing");return null;}
 let u;
 try{u=new URL(value);}catch{errors.push(label+" must be a valid absolute URL");return null;}
 if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||u.pathname!=="/"){
  errors.push(label+" must be a clean HTTPS origin without credentials, path, query or fragment");
  return null;
 }
 return u;
}
function postgres(value,label,ref,errors,{migration=false}={}){
 if(!nonempty(value)){errors.push(label+" is missing");return null;}
 let u;
 try{u=new URL(value);}catch{errors.push(label+" must be a valid PostgreSQL connection URL");return null;}
 if(!["postgresql:","postgres:"].includes(u.protocol)){
  errors.push(label+" must use the postgres or postgresql protocol");return null;
 }
 if(!u.password||u.hash||u.searchParams.get("sslmode")===null){
  errors.push(label+" requires a password with reserved characters URL-encoded and an explicit TLS setting");
  return null;
 }
 if(!allowedTls.has(u.searchParams.get("sslmode"))){
  errors.push(label+" must use sslmode=require, verify-ca or verify-full");return null;
 }
 if(u.pathname!=="/postgres"){
  errors.push(label+" must target the postgres database");return null;
 }
 const isDirect=u.hostname==="db."+ref+".supabase.co"&&u.username==="postgres"&&
    (u.port==="5432"||u.port==="");
 const isSession=pooler.test(u.hostname)&&u.username==="postgres."+ref&&u.port==="5432";
 const isTxn=pooler.test(u.hostname)&&u.username==="postgres."+ref&&u.port==="6543";
 if(!isDirect&&!isSession&&!isTxn){
  errors.push(label+" must belong to the exact reviewed Supabase project (not another Postgres provider)");
  return null;
 }
 if(migration&&isTxn){
  errors.push(label+" cannot use a transaction-mode pooler for migrations");
  return null;
 }
 return {mode:isDirect?"direct":isSession?"session":"transaction"};
}
export function inspectEnvironment(env,{target="production"}={}){
 const errors=[],warnings=[];
 if(!["production","staging"].includes(target))
  return {ok:false,errors:["Target must be production or staging"],warnings:[]};
 const refKey=target==="staging"?"SMART_HUB_STAGE_SUPABASE_REF":"SMART_HUB_PRODUCTION_SUPABASE_REF";
 const ref=env[refKey]??"";
 if(!refPattern.test(ref))errors.push(refKey+" must be the exact reviewed 20-character project ref");
 if(target==="staging"){
  const prod=env.SMART_HUB_PRODUCTION_SUPABASE_REF??"";
  if(!refPattern.test(prod))errors.push("SMART_HUB_PRODUCTION_SUPABASE_REF is required to prove staging separation");
  else if(prod===ref)errors.push("Staging and production Supabase projects MUST be different");
 }
 const supabase=origin(env.NEXT_PUBLIC_SUPABASE_URL,"NEXT_PUBLIC_SUPABASE_URL",errors);
 if(supabase&&supabase.hostname!==ref+".supabase.co")
  errors.push("Supabase URL does not match the reviewed "+target+" project ref");
 if(!nonempty(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)||
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_"))
  errors.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key");
 const runtime=postgres(env.DATABASE_URL,"DATABASE_URL",ref,errors);
 const migration=postgres(env.DIRECT_URL,"DIRECT_URL",ref,errors,{migration:true});
 if(runtime?.mode!=="transaction")
  warnings.push("Serverless DATABASE_URL should use the Supabase transaction pooler on port 6543");
 const app=origin(env.APP_BASE_URL,"APP_BASE_URL",errors);
 if(app&&supabase&&app.origin===supabase.origin)
  errors.push("The application origin cannot be the Supabase API origin");
 if(target==="staging"&&app&&!/staging|preview|git-/i.test(app.hostname))
  errors.push("Staging APP_BASE_URL must clearly identify a staging or Preview hostname");
 if(!validKey(env.AUTH_RECOVERY_SECRET,32))
  errors.push("AUTH_RECOVERY_SECRET must have at least 32 characters");
 if(nonempty(env.SUPABASE_SECRET_KEY)&&
    (!env.SUPABASE_SECRET_KEY.startsWith("sb_secret_")||
     env.SUPABASE_SECRET_KEY===env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY))
  errors.push("SUPABASE_SECRET_KEY must be a distinct server-only Supabase secret key");
 if(!nonempty(env.SUPABASE_SECRET_KEY))
  warnings.push("Restricted Super Admin invitations require a server-only SUPABASE_SECRET_KEY");
 if(nonempty(env.FARMER_BANK_ENCRYPTION_KEY)){
  const key=env.FARMER_BANK_ENCRYPTION_KEY;
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(key)||Buffer.from(key,"base64").length!==32)
   errors.push("FARMER_BANK_ENCRYPTION_KEY must be a Base64-encoded 32-byte key");
 }else warnings.push("FARMER_BANK_ENCRYPTION_KEY is needed before encrypted farmer banking features work");
 if(env.PUBLIC_CONTACT_ENABLED==="true"){
  if(!validKey(env.CONTACT_HASH_SECRET,32)||!nonempty(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)||
     !nonempty(env.TURNSTILE_SECRET_KEY))
   errors.push("Enabling public contact requires a 32+ character contact hash key and both Turnstile keys");
 }
 for(const key of ["PAYMENTS_ENABLED","SUPPLIER_PAYOUTS_ENABLED","PUBLIC_SIGNUP_ENABLED"]){
  if(env[key]==="true")
   errors.push(key+" must remain disabled during initial infrastructure activation");
 }
 if(target==="staging"&&/^sk_live_/.test(env.PAYSTACK_SECRET_KEY??""))
  errors.push("A live Paystack key cannot be installed in staging");
 if(env.POSTGRES_URL||env.POSTGRES_PRISMA_URL)
  warnings.push("Additional POSTGRES_* integration variables detected; ensure they do not reference a second database");
 if(env.RELEASE_ACCEPTANCE_ENABLED==="true"&&target==="production")
  errors.push("The protected acceptance readiness endpoint must remain disabled in production");
 if(!nonempty(env.FIELD_EVIDENCE_BUCKET)||!nonempty(env.SHIPMENT_EVIDENCE_BUCKET))
  warnings.push("Private Storage bucket names should be explicitly configured before field/fulfilment tests");
 return {
  ok:errors.length===0,
  target,ref:refPattern.test(ref)?ref:null,
  runtimeMode:runtime?.mode??null,
  migrationMode:migration?.mode??null,
  errors,warnings
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const target=process.argv.includes("--staging")?"staging":process.argv.includes("--production")?"production":null;
 if(!target){
  console.error("Usage: node scripts/release/check-environment.mjs --production OR --staging");
  process.exitCode=2;
 }else{
  const status=inspectEnvironment(process.env,{target});
  // These diagnostics contain only fixed field names and validation messages.
  console.log("SmartHub "+target+" environment: "+(status.ok?"PASS":"FAIL"));
  if(status.ok)console.log("Supabase project ref verified; runtime="+status.runtimeMode+" migration="+status.migrationMode);
  for(const warning of status.warnings)console.warn("NOTICE: "+warning);
  for(const error of status.errors)console.error("CONFIG ERROR: "+error);
  if(!status.ok)process.exitCode=1;
 }
}
