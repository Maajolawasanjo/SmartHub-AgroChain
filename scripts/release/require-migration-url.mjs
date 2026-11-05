// Pre-migration safety gate. No connection and no secret values in output.
// DIRECT_URL is mandatory; never use DATABASE_URL for schema migrations.
const fail=message=>{console.error("MIGRATION CONFIG ERROR: "+message);process.exitCode=1;};
const raw=process.env.DIRECT_URL;
if(!raw){
 fail("DIRECT_URL must be set to the approved direct/session PostgreSQL connection.");
}else{
 try{
  const url=new URL(raw);
  const urlRef=(url.hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/)||[])[1];
  const pooler=/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname);
  const userRef=url.username.startsWith("postgres.")?url.username.slice(9):null;
  const ref=urlRef??(pooler?userRef:null);
  const stageRef=process.env.SMART_HUB_STAGE_SUPABASE_REF||"";
  const prodRef=process.env.SMART_HUB_PRODUCTION_SUPABASE_REF||"";
  const staging=stageRef.length>0;
  const expected=staging?stageRef:prodRef;
  // No implicit fallback to production based merely on the presence of a
  // database URL and project reference. Schema migrations need independent
  // release approval at the target scope.
  const approved=staging?
   (stageRef!==prodRef&&
    process.env.RELEASE_STAGE_CONFIRM==="I_ACKNOWLEDGE_STAGING_ONLY"&&
    process.env.STAGING_MIGRATIONS_APPROVED==="true"&&
    !!process.env.STAGING_BACKUP_RESTORE_EVIDENCE):
   (process.env.RELEASE_PRODUCTION_MIGRATIONS_APPROVED==="I_APPROVE_PRODUCTION_SCHEMA_MIGRATIONS"&&
    !!process.env.PRODUCTION_BACKUP_RESTORE_EVIDENCE&&
    process.env.PAYMENTS_ENABLED!=="true"&&
    process.env.SUPPLIER_PAYOUTS_ENABLED!=="true");
  const publicOrigin=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(!/^[a-z0-9]{20}$/.test(expected??""))
   fail("An approved staging or production Supabase project reference is required.");
  else if(!approved)
   fail("Schema migration requires target-specific approval and backup/restore evidence.");
  else if(publicOrigin!=="https://"+expected+".supabase.co"&&publicOrigin!=="https://"+expected+".supabase.co/")
   fail("Public Supabase configuration must match the approved migration project.");
  else if(ref!==expected)
   fail("DIRECT_URL does not match the approved Supabase project.");
  else if(!["postgresql:","postgres:"].includes(url.protocol)||!url.password||
   url.pathname!=="/postgres"||url.hash||
   !["require","verify-ca","verify-full"].includes(url.searchParams.get("sslmode"))||
   !(urlRef&&url.username==="postgres"&&(url.port==="5432"||!url.port)||
     pooler&&url.username==="postgres."+ref&&url.port==="5432"))
   fail("DIRECT_URL must be a TLS-enabled project-matched direct or session-mode connection on port 5432.");
 }catch{
  fail("DIRECT_URL must be a valid PostgreSQL connection URL.");
 }
}
