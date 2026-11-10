// Server-only runtime guard; intentionally no database access or secret logging.
// Next.js may be built for a Vercel Preview with NODE_ENV=production, so
// VERCEL_ENV (rather than NODE_ENV) selects the production vs staging project.
export type RuntimeDatabaseEnvironment=Record<string,string|undefined>;

export function assertRuntimeDatabaseTarget(connectionString:string,env:RuntimeDatabaseEnvironment=process.env){
 const publicUrl=env.NEXT_PUBLIC_SUPABASE_URL;
 const publicRef=publicUrl?.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/)?.[1];
 if(!publicRef)throw new Error("Configured Supabase public URL is missing or invalid.");
 let url:URL;
 try{url=new URL(connectionString);}catch{throw new Error("Database connection configuration is invalid.");}
 const direct=url.hostname==="db."+publicRef+".supabase.co" &&
  url.username==="postgres" && (url.port==="5432"||url.port==="");
 const pooler=/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) &&
  url.username==="postgres."+publicRef && ["5432","6543"].includes(url.port);
 if(!["postgresql:","postgres:"].includes(url.protocol)||!url.password||
  url.pathname!=="/postgres"||url.hash||
  !["require","verify-ca","verify-full"].includes(url.searchParams.get("sslmode")??"")||
  !(direct||pooler))
  throw new Error("Database runtime connection must target the configured TLS-enabled Supabase project.");
 const prod=env.SMART_HUB_PRODUCTION_SUPABASE_REF;
 const stage=env.SMART_HUB_STAGE_SUPABASE_REF;
 if(prod&&stage&&prod===stage)throw new Error("Production and staging Supabase projects must differ.");
 // Pin the independently reviewed SmartHub AgroChain V2 project. An arbitrary
 // self-consistent pair of public URL and production ref must not redirect this
 // application to another tenant/project (including the separate Agronexus app).
 // A future production project migration requires reviewed source and release changes.
 if(env.VERCEL_ENV==="production"&&
   (!prod||prod!==publicRef||prod!=="ematieqwxoiwoovmqdba"))
  throw new Error("Production database reference does not match the reviewed SmartHub AgroChain V2 project.");
 if(env.VERCEL_ENV==="preview"&&(!stage||stage!==publicRef||stage===prod))
  throw new Error("Preview deployment must use the separate reviewed staging database.");
 return publicRef;
}
