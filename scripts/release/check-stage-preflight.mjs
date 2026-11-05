import pg from "pg";
import {readFileSync} from "node:fs";
import {ensureStageScriptEnvironment} from "./stage-target.mjs";
import {migrationManifest,expectedModelTables,assessStageInventory} from "./stage-inventory.mjs";

const target=ensureStageScriptEnvironment();
if(!target)process.exit(1);
const client=new pg.Client({
 connectionString:target.databaseUrl,
 connectionTimeoutMillis:10000,
 statement_timeout:20000,
 application_name:"smarthub-staging-schema-inventory-readonly"
});
let connected=false;
try{
 await client.connect();connected=true;
 await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const identity=await client.query("SELECT current_database() AS db");
 if(identity.rows[0]?.db!=="postgres")
  throw Error("The connected database is not the approved postgres database.");
 const roles=await client.query(
  "SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')");
 const tableRows=await client.query(
  "SELECT c.relname AS name,c.relrowsecurity AS rls"+
  " FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace"+
  " WHERE n.nspname='public' AND c.relkind='r'");
 const hasHistory=await client.query(
  "SELECT to_regclass('public.\"_prisma_migrations\"') IS NOT NULL AS present");
 const historyPresent=hasHistory.rows[0]?.present===true;
 const applied=historyPresent
  ?(await client.query(
    'SELECT migration_name,checksum,finished_at,rolled_back_at FROM public."_prisma_migrations"')).rows
  :[];
 const state=assessStageInventory({
  manifest:migrationManifest(),
  modelTables:expectedModelTables(readFileSync("prisma/schema.prisma","utf8")),
  historyPresent,applied,tables:tableRows.rows,roles:roles.rows.map(r=>r.rolname)
 });
 await client.query("ROLLBACK");
 // This output contains counts and generic error categories only.
 console.log(JSON.stringify({...state,scope:"reviewed-staging-only",
  connection:"read-only",migrationPerformed:false,anyBusinessDataRead:false},null,2));
 if(!state.ok)process.exitCode=1;
}catch{
 try{if(connected)await client.query("ROLLBACK");}catch{}
 // Never forward driver errors containing host/user details to CI logs.
 console.error("STAGING INVENTORY ERROR: connection, identity, migration history or read-only query failed. Review protected staging configuration.");
 process.exitCode=1;
}finally{
 if(connected)await client.end().catch(()=>undefined);
}
