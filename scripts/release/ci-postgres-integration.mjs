import {createHash} from "node:crypto";
import {readFileSync,readdirSync} from "node:fs";
import {spawnSync} from "node:child_process";
import pg from "pg";
import {CI_DATABASE_URL,assertEphemeralCIEnvironment} from "./ci-postgres-guard.mjs";

// Explicit fail-closed check BEFORE connecting, creating objects or invoking
// Prisma. Nothing in this job knows or can use actual Supabase credentials.
assertEphemeralCIEnvironment();

async function usingClient(fn){
 const client=new pg.Client({connectionString:CI_DATABASE_URL,
  connectionTimeoutMillis:5000,statement_timeout:15000,
  application_name:"smarthub-disposable-ci-postgres"});
 await client.connect();
 try{return await fn(client);}finally{await client.end();}
}
await usingClient(async client=>{
 // Minimal metadata needed by two already-reviewed Prisma migrations.
 // This is NOT a Supabase Auth/Storage emulation.
 await client.query("CREATE ROLE anon NOLOGIN");
 await client.query("CREATE ROLE authenticated NOLOGIN");
 await client.query("CREATE SCHEMA storage");
 await client.query(`CREATE TABLE storage.buckets (
  id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false,
  file_size_limit bigint, allowed_mime_types text[]
 )`);
});

const result=spawnSync("./node_modules/.bin/prisma",["migrate","deploy"],{
 env:process.env,cwd:process.cwd(),stdio:"inherit",timeout:180000,shell:false
});
if(result.error||result.status!==0)
 throw Error("Prisma migration chain FAILED against the disposable CI PostgreSQL database.");

await usingClient(async client=>{
 const sql=(query,params=[])=>client.query(query,params);
 const directories=readdirSync("prisma/migrations",{withFileTypes:true})
  .filter(x=>x.isDirectory()).map(x=>x.name).sort();
 if(directories.length<17)throw Error("Migration suite unexpectedly lacks the 17 reviewed migrations.");
 const ledger=await sql('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public."_prisma_migrations"');
 const applied=new Map(ledger.rows.map(row=>[row.migration_name,row]));
 if(applied.size!==directories.length||ledger.rows.length!==directories.length)
  throw Error("Migration ledger does not exactly match the checked-in migration folders.");
 for(const directory of directories){
  const item=applied.get(directory);
  if(!item||!item.finished_at||item.rolled_back_at)
   throw Error("Incomplete/unknown migration in disposable database: "+directory);
  const checksum=createHash("sha256").update(readFileSync("prisma/migrations/"+directory+"/migration.sql")).digest("hex");
  if(item.checksum!==checksum)
   throw Error("Migration checksum drift in disposable database: "+directory);
 }
 const schema=readFileSync("prisma/schema.prisma","utf8");
 const modelNames=new Map([...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)]
  .map(match=>[match[1],match[2].match(/@@map\("([^"]+)"\)/)?.[1]??match[1]]));
 if(modelNames.size<70)throw Error("Unexpectedly few checked-in Prisma models.");
 const metadata=await sql(`SELECT c.relname AS name,c.relrowsecurity AS rls,
  has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_grant,
  has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS authenticated_grant
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'`);
 const tables=new Map(metadata.rows.map(row=>[row.name,row]));
 for(const [model,name] of modelNames){
  const table=tables.get(name);
  if(!table)throw Error("Missing Prisma model table: "+model+" -> "+name);
  if(!table.rls)throw Error("RLS disabled on checked-in app table: "+name);
  if(table.anon_grant||table.authenticated_grant)
   throw Error("Unauthenticated or direct-client role has app-table privileges: "+name);
 }
 const bucket=await sql("SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets ORDER BY id");
 if(bucket.rows.length!==2)throw Error("Expected precisely two private evidence bucket registrations.");
 for(const name of ["field-visit-evidence","shipment-evidence"]){
  const row=bucket.rows.find(x=>x.id===name);
  if(!row||row.public!==false||Number(row.file_size_limit)!==10485760||
   !["image/jpeg","image/png","image/webp","application/pdf"].every(m=>row.allowed_mime_types?.includes(m)))
   throw Error("Missing or insecure disposable evidence bucket: "+name);
 }
 // Actually attempt unauthorized SQL as each Supabase-compatible client role.
 // Check explicit PostgreSQL permission errors; empty tables alone are no proof.
 for(const role of ["anon","authenticated"]){
  await sql("SET ROLE "+role);
  let rejected=false;
  try{await sql('SELECT id FROM public."app_accounts" LIMIT 1');}
  catch(error){rejected=error?.code==="42501";}
  finally{await sql("RESET ROLE");}
  if(!rejected)throw Error("Direct database SELECT did not fail with permission denied for "+role);
 }
 const count=await sql('SELECT COUNT(*)::int AS n FROM public."app_accounts"');
 if(count.rows[0]?.n!==0)throw Error("Disposable database unexpectedly contains application identities.");
 console.log("PASS: disposable PostgreSQL 17; "+directories.length+" exact Prisma migrations; "+
  modelNames.size+" protected app models; 2 private bucket registrations; both direct roles denied.");
 console.log("This verifies real PostgreSQL migrations and grants, NOT real Supabase Auth, Storage API, SMS, or live V2 readiness.");
});
