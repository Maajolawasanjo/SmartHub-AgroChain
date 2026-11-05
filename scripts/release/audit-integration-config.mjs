// Safe, offline configuration inspection for Vercel + Supabase + Prisma.
// Never print any environment VALUE, URL, password, token or connection string.
// The audit makes no requests and never modifies any database or infrastructure.
import {pathToFileURL} from "node:url";

const sslModes=new Set(["require","verify-ca","verify-full"]);
const refPattern=/^[a-z0-9]{20}$/;
const poolerPattern=/^[a-z0-9-]+\.pooler\.supabase\.com$/;

export function auditIntegrationConfig(env,environment="staging"){
 if(!["staging","production"].includes(environment))
  throw new Error("Choose --environment=staging or --environment=production.");
 const errors=[],warnings=[];
 const fail=(name,problem)=>errors.push(name+": "+problem);
 const warn=(name,problem)=>warnings.push(name+": "+problem);
 const required=name=>{
  const value=env[name];
  if(!value)fail(name,"missing");return value??"";
 };
 const project=required("NEXT_PUBLIC_SUPABASE_URL");
 const publishable=required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
 let ref="";
 try{
  const url=new URL(project);
  if(url.protocol!=="https:"||url.pathname!=="/"||url.search||url.hash||
    url.username||url.password||!url.hostname.endsWith(".supabase.co"))throw Error();
  ref=url.hostname.slice(0,-".supabase.co".length);
  if(!refPattern.test(ref))throw Error();
 }catch{fail("NEXT_PUBLIC_SUPABASE_URL","must be a clean HTTPS Supabase project origin.");ref="";}
 if(!publishable.startsWith("sb_publishable_"))
  fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","expected a Supabase publishable key.");
 const productionRef=required("SMART_HUB_PRODUCTION_SUPABASE_REF");
 if(productionRef&&!refPattern.test(productionRef))
  fail("SMART_HUB_PRODUCTION_SUPABASE_REF","must be a 20-character project reference.");
 if(productionRef&&ref){
  if(environment==="staging"&&productionRef===ref)
   fail("Supabase project isolation","staging must NOT use the production database.");
  if(environment==="production"&&productionRef!==ref)
   fail("Supabase project isolation","production URL must match approved production reference.");
 }
 for(const [name,expectedMode] of [["DATABASE_URL","transaction"],["DIRECT_URL","migration"]]){
  const raw=required(name);if(!raw)continue;
  try{
   const u=new URL(raw);
   if(!["postgresql:","postgres:"].includes(u.protocol)||!u.password||
      u.pathname!=="/postgres"||!sslModes.has(u.searchParams.get("sslmode")))throw Error();
   const isDirect=u.hostname==="db."+ref+".supabase.co"&&u.username==="postgres"&&
     (u.port==="5432"||u.port==="");
   const isSession=poolerPattern.test(u.hostname)&&u.username==="postgres."+ref&&u.port==="5432";
   const isTx=poolerPattern.test(u.hostname)&&u.username==="postgres."+ref&&u.port==="6543";
   if(expectedMode==="transaction"&&!isTx)throw Error();
   if(expectedMode==="migration"&&!(isDirect||isSession))throw Error();
  }catch{fail(name,expectedMode==="transaction"
    ?"must use project-matched TLS Supavisor transaction pooler port 6543."
    :"must use project-matched TLS direct or session pooler port 5432.");}
 }
 const app=required("APP_BASE_URL");
 try{
  const url=new URL(app);
  if(url.protocol!=="https:"||url.pathname!=="/"||url.search||url.hash||
    url.username||url.password||url.hostname==="localhost"||url.hostname==="127.0.0.1")throw Error();
  if(environment==="staging"&&!/staging|preview|git-/i.test(url.hostname))
   fail("APP_BASE_URL","staging origin must identify staging/preview.");
 }catch{fail("APP_BASE_URL","must be the deployment's clean HTTPS origin, not localhost.");}
 if((env.AUTH_RECOVERY_SECRET??"").length<32)
  fail("AUTH_RECOVERY_SECRET","missing or shorter than 32 characters.");
 const secret=env.SUPABASE_SECRET_KEY??"";
 if(!secret.startsWith("sb_secret_"))
  fail("SUPABASE_SECRET_KEY","missing or not a server-only Supabase secret key.");
 if((env.CONTACT_HASH_SECRET??"").length<32)
  fail("CONTACT_HASH_SECRET","missing or shorter than 32 characters.");
 const bank=env.FARMER_BANK_ENCRYPTION_KEY??"";
 const bankBytes=/^[A-Za-z0-9+/]+={0,2}$/.test(bank)?Buffer.from(bank,"base64"):Buffer.alloc(0);
 if(bankBytes.length!==32)
  fail("FARMER_BANK_ENCRYPTION_KEY","must be a private 32-byte base64 AES-256 key.");
 if(env.PUBLIC_SIGNUP_ENABLED==="true")
  fail("PUBLIC_SIGNUP_ENABLED","must stay false until legal/role onboarding acceptance.");
 if(env.SUPPLIER_PAYOUTS_ENABLED==="true")
  fail("SUPPLIER_PAYOUTS_ENABLED","must stay false until finance provider acceptance.");
 if(env.PAYMENTS_ENABLED==="true")
  fail("PAYMENTS_ENABLED","must stay false for this prelaunch audit.");
 if(env.PUBLIC_CONTACT_ENABLED==="true"&&
    (!(env.TURNSTILE_SECRET_KEY??"")||!(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY??"")))
  fail("PUBLIC_CONTACT_ENABLED","requires both Turnstile credentials.");
 if(env.PUBLIC_CONTACT_ENABLED!=="true")
  warn("PUBLIC_CONTACT_ENABLED","public enquiry form remains disabled until anti-bot and privacy approval.");
 if(!env.PAYSTACK_SECRET_KEY)
  warn("PAYSTACK_SECRET_KEY","Paystack intentionally unconfigured; checkout disabled.");
 if(environment==="production")
  warn("Production deployment","this local audit does not verify migrations, real auth, Storage, backups or provider connectivity.");
 return {environment,ok:errors.length===0,errors,warnings};
}
async function main(){
 await import("dotenv/config");
 const arg=process.argv.find(x=>x.startsWith("--environment="))??"";
 const environment=arg.split("=")[1]??"";
 const result=auditIntegrationConfig(process.env,environment);
 console.log(JSON.stringify(result,null,2));
 if(!result.ok)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 main().catch(()=>{console.error("Configuration audit could not load its local env reader.");process.exitCode=1;});
