// Production DB identity gate for READ-ONLY inventory only.
// Never log private URLs, password, token, or host values.
const approvedPattern=/^[a-z0-9]{20}$/;
const pooler=/^[a-z0-9-]+\.pooler\.supabase\.com$/;
const tls=new Set(["require","verify-ca","verify-full"]);
export function assertProductionReadOnlyTarget(env){
 if(env.RELEASE_PRODUCTION_READONLY_CONFIRM!=="I_APPROVE_READONLY_PRODUCTION_INVENTORY")
  throw Error("Read-only production inventory requires explicit approval.");
 const ref=env.SMART_HUB_PRODUCTION_SUPABASE_REF??"";
 if(!approvedPattern.test(ref))throw Error("Approved production project reference is required.");
 if(env.RELEASE_ACCEPTANCE_ENABLED==="true")
  throw Error("Production acceptance endpoint must remain disabled.");
 let publicUrl;
 try{publicUrl=new URL(env.NEXT_PUBLIC_SUPABASE_URL??"");}
 catch{throw Error("Invalid production Supabase public origin.");}
 if(publicUrl.protocol!=="https:"||publicUrl.hostname!==ref+".supabase.co"||
  publicUrl.pathname!=="/"||publicUrl.search||publicUrl.hash||publicUrl.username||publicUrl.password)
  throw Error("Production Supabase public origin does not match approved project.");
 let direct;
 try{direct=new URL(env.DIRECT_URL??"");}
 catch{throw Error("DIRECT_URL is missing or invalid.");}
 const isDirect=direct.hostname==="db."+ref+".supabase.co"&&direct.username==="postgres"&&
  (direct.port==="5432"||direct.port==="");
 const isSession=pooler.test(direct.hostname)&&direct.username==="postgres."+ref&&direct.port==="5432";
 if(!["postgres:","postgresql:"].includes(direct.protocol)||!direct.password||
  direct.pathname!=="/postgres"||direct.hash||!tls.has(direct.searchParams.get("sslmode"))||
  !(isDirect||isSession))
  throw Error("DIRECT_URL must be the approved production TLS direct/session connection on port 5432.");
 return {ref,connectionString:env.DIRECT_URL};
}
