import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {migrationManifest,expectedModelTables,assessStageInventory} from
 "../scripts/release/stage-inventory.mjs";
const manifest=migrationManifest();
const tables=expectedModelTables(readFileSync("prisma/schema.prisma","utf8"));
const roles=["anon","authenticated"];
const applied=(m)=>({migration_name:m.name,checksum:m.checksum,
 finished_at:"2026-11-05T00:00:00Z",rolled_back_at:null});
const evaluate=patch=>assessStageInventory({
 manifest,modelTables:tables,roles,historyPresent:false,applied:[],
 tables:[],...patch
});
test("17 nonempty ordered reviewed SQL migrations back 73 uniquely mapped tables",()=>{
 assert.equal(manifest.length,17);
 assert.equal(tables.length,73);
 assert.equal(new Set(tables).size,tables.length);
 assert.deepEqual(manifest.map(m=>m.name),[...manifest.map(m=>m.name)].sort());
 assert.equal(manifest.at(-1).name,"20261105010000_release_delivery_review");
 assert.equal(tables.includes("app_accounts"),true);
 assert.equal(tables.includes("supply_lots"),true);
 assert.equal(tables.includes("supplier_obligations"),true);
});
test("Brand-new isolated Supabase public schema is preflight-safe and must still migrate",()=>{
 const a=evaluate({});
 assert.equal(a.ok,true);
 assert.equal(a.state,"empty");
 assert.equal(a.pendingMigrations,manifest.length);
 assert.ok(a.warnings.length);
 assert.deepEqual(a.errors,[]);
});
test("Partially migrated staging may be inspected without requiring all tables",()=>{
 const a=evaluate({historyPresent:true,applied:[applied(manifest[0])],
  tables:[{name:"_prisma_migrations",rls:false},{name:"app_accounts",rls:true}]});
 assert.equal(a.ok,true,a.errors.join("; "));
 assert.equal(a.state,"partial");
 assert.equal(a.completedMigrations,1);
 assert.equal(a.pendingMigrations,16);
});
test("Complete migration history must have all 73 mapped tables and enabled RLS",()=>{
 const good=evaluate({historyPresent:true,applied:manifest.map(applied),
  tables:tables.map(name=>({name,rls:true}))});
 assert.equal(good.ok,true,good.errors.join("; "));
 assert.equal(good.state,"complete");
 assert.equal(good.pendingMigrations,0);
 const missing=evaluate({historyPresent:true,applied:manifest.map(applied),
  tables:tables.slice(0,72).map(name=>({name,rls:true}))});
 assert.equal(missing.ok,false);
 assert.ok(missing.errors.some(x=>x.includes("missing despite")));
});
test("Unknown or failed migration history and checksum drift fail closed",()=>{
 const unexpected=evaluate({historyPresent:true,applied:[{...applied(manifest[0]),migration_name:"other_project_migration"}]});
 assert.equal(unexpected.ok,false);
 assert.ok(unexpected.errors.some(x=>x.includes("Unknown migration")));
 const drift=evaluate({historyPresent:true,applied:[{...applied(manifest[0]),checksum:"tampered"}]});
 assert.equal(drift.ok,false);
 const incomplete=evaluate({historyPresent:true,applied:[{...applied(manifest[0]),finished_at:null}]});
 assert.equal(incomplete.ok,false);
 const duplicates=evaluate({historyPresent:true,applied:[applied(manifest[0]),applied(manifest[0])]});
 assert.equal(duplicates.ok,false);
});
test("Untracked existing tables and disabled RLS reject a preflight",()=>{
 for(const obj of [
  {historyPresent:false,tables:[{name:"app_accounts",rls:true}]},
  {historyPresent:true,tables:[{name:"orders_from_other_business",rls:true}]},
  {historyPresent:true,tables:[{name:"app_accounts",rls:false}]},
  {historyPresent:true,tables:[{name:"app_accounts",rls:true}],applied:[]}
 ]){
  const value=evaluate(obj);
  assert.equal(value.ok,false,value.errors.join("; "));
 }
});
test("Non-Supabase role set is rejected",()=>{
 const x=evaluate({roles:["postgres"]});
 assert.equal(x.ok,false);
 assert.ok(x.errors.some(e=>e.includes("Supabase roles")));
});
test("Read-only stage preflight runs before migrations and can stop without stage web sessions",()=>{
 const wf=readFileSync(".github/workflows/staging-acceptance.yml","utf8");
 const script=readFileSync("scripts/release/check-stage-preflight.mjs","utf8");
 const pre=wf.indexOf("check-stage-preflight.mjs");
 const mutate=wf.indexOf("run: npm run db:migrate");
 assert.ok(pre>=0&&mutate>pre);
 assert.match(wf,/preflight_only:/);
 assert.match(wf,/default: true/);
 assert.match(wf,/inputs\.apply_migrations && !inputs\.preflight_only/);
 assert.match(wf,/if: \${{ !inputs\.preflight_only }}/);
 assert.match(wf,/STAGING_BACKUP_RESTORE_EVIDENCE/);
 assert.match(script,/BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/);
 assert.match(script,/ROLLBACK/);
 assert.match(script,/current_database\(\)/);
 assert.match(script,/to_regclass/);
 assert.doesNotMatch(script,/db push|migrate deploy|migrate reset|INSERT INTO|DELETE FROM|UPDATE\s/);
});
