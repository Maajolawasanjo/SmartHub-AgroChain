// Explicitly approved, read-only production inventory. No migrations, no DML,
// no business-row queries, and no secrets in output.
import pg from "pg";
import {readFileSync} from "node:fs";
import {assertProductionReadOnlyTarget} from "./production-readonly-target.mjs";
import {inspectCommerceInvariants} from "./commerce-invariants.mjs";
import {migrationManifest,expectedModelTables,assessStageInventory} from "./stage-inventory.mjs";
let target;
try{target=assertProductionReadOnlyTarget(process.env);}
catch{console.error("PRODUCTION INVENTORY REJECTED: invalid target identity or missing authorization.");process.exit(1);}
const client=new pg.Client({connectionString:target.connectionString,
 connectionTimeoutMillis:10000,statement_timeout:20000,
 application_name:"smarthub-production-inventory-readonly"});
let connected=false;
try{
 await client.connect();connected=true;
 await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const identity=await client.query("SELECT current_database() AS db");
 if(identity.rows[0]?.db!=="postgres")throw Error("Unexpected production database identity.");
 const roles=await client.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')");
 const tables=await client.query(
  "SELECT c.relname AS name,c.relrowsecurity AS rls FROM pg_class c "+
  "JOIN pg_namespace n ON n.oid=c.relnamespace "+
  "WHERE n.nspname='public' AND c.relkind='r'");
 const history=await client.query("SELECT to_regclass('public.\"_prisma_migrations\"') IS NOT NULL AS present");
 const historyPresent=history.rows[0]?.present===true;
 const applied=historyPresent?(await client.query(
  'SELECT migration_name,checksum,finished_at,rolled_back_at FROM public."_prisma_migrations"')).rows:[];
 const result=assessStageInventory({manifest:migrationManifest(),
  modelTables:expectedModelTables(readFileSync("prisma/schema.prisma","utf8")),
  historyPresent,applied,tables:tables.rows,roles:roles.rows.map(r=>r.rolname)});
 const commerce=result.ok&&result.state==="complete"
  ?await inspectCommerceInvariants(sql=>client.query(sql))
  :{ok:false,checks:0,failures:[],skipped:"migration inventory is incomplete or inconsistent"};
 await client.query("ROLLBACK");
 console.log(JSON.stringify({...result,commerce,scope:"approved-production",connection:"read-only",
  migrationPerformed:false,businessDataRead:false},null,2));
 if(!result.ok||!commerce.ok)process.exitCode=1;
}catch{
 if(connected)await client.query("ROLLBACK").catch(()=>undefined);
 console.error("PRODUCTION INVENTORY ERROR: connection, database identity or schema inspection failed.");
 process.exitCode=1;
}finally{
 if(connected)await client.end().catch(()=>undefined);
}
