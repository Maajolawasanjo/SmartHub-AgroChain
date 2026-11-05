import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";

const stage="abcdefghijklmnopqrst",production="zyxwvutsrqponmlkjihg";
const postgres=ref=>"postgresql://postgres:fakepassword@db."+ref+".supabase.co:5432/postgres?sslmode=require";
const base={
 DIRECT_URL:postgres(stage),SMART_HUB_STAGE_SUPABASE_REF:stage,
 SMART_HUB_PRODUCTION_SUPABASE_REF:production,
 NEXT_PUBLIC_SUPABASE_URL:"https://"+stage+".supabase.co",
 RELEASE_STAGE_CONFIRM:"I_ACKNOWLEDGE_STAGING_ONLY",
 STAGING_MIGRATIONS_APPROVED:"true",
 STAGING_BACKUP_RESTORE_EVIDENCE:"isolated-restore-reviewed",
 PAYMENTS_ENABLED:"false",SUPPLIER_PAYOUTS_ENABLED:"false"
};
const run=patch=>{
 const env={...process.env,...base,...patch};
 for(const [k,v] of Object.entries(env))if(v===null||v===undefined)delete env[k];
 const p=spawnSync(process.execPath,["scripts/release/require-migration-url.mjs"],{env,encoding:"utf8"});
 return {status:p.status,stdout:p.stdout,stderr:p.stderr};
};
test("explicit reviewed staging migration passes offline gate without connecting",()=>{
 assert.equal(run({}).status,0);
});
test("staging cannot migrate with missing approval, evidence, or wrong project",()=>{
 for(const patch of [
  {STAGING_MIGRATIONS_APPROVED:"false"},
  {STAGING_BACKUP_RESTORE_EVIDENCE:null},
  {RELEASE_STAGE_CONFIRM:null},
  {DIRECT_URL:postgres(production)},
  {NEXT_PUBLIC_SUPABASE_URL:"https://"+production+".supabase.co"},
  {SMART_HUB_PRODUCTION_SUPABASE_REF:stage},
  {DIRECT_URL:postgres(stage).replace("5432","6543")},
 ]){
  const r=run(patch);assert.notEqual(r.status,0,JSON.stringify(patch));
  assert.doesNotMatch(r.stderr,/fakepassword/);
 }
});
test("production cannot be selected implicitly or share staging approval",()=>{
 const prod={SMART_HUB_STAGE_SUPABASE_REF:null,DIRECT_URL:postgres(production),
  NEXT_PUBLIC_SUPABASE_URL:"https://"+production+".supabase.co"};
 assert.notEqual(run(prod).status,0);
 assert.notEqual(run({...prod,RELEASE_PRODUCTION_MIGRATIONS_APPROVED:"I_APPROVE_PRODUCTION_SCHEMA_MIGRATIONS"}).status,0);
 assert.equal(run({...prod,RELEASE_PRODUCTION_MIGRATIONS_APPROVED:"I_APPROVE_PRODUCTION_SCHEMA_MIGRATIONS",
  PRODUCTION_BACKUP_RESTORE_EVIDENCE:"verified-backup-restore"}).status,0);
 for(const patch of [{PAYMENTS_ENABLED:"true"},{SUPPLIER_PAYOUTS_ENABLED:"true"},
  {DIRECT_URL:postgres(stage)}]){
  const r=run({...prod,RELEASE_PRODUCTION_MIGRATIONS_APPROVED:"I_APPROVE_PRODUCTION_SCHEMA_MIGRATIONS",
   PRODUCTION_BACKUP_RESTORE_EVIDENCE:"verified-backup-restore",...patch});
  assert.notEqual(r.status,0);
 }
});
test("workflow explicitly forwards approval/evidence to migrate step",()=>{
 const s=readFileSync(".github/workflows/staging-acceptance.yml","utf8");
 const i=s.indexOf("- name: Migrate ONLY the separately reviewed staging project");
 assert.ok(i>=0);
 const part=s.slice(i,i+450);
 assert.match(part,/STAGING_MIGRATIONS_APPROVED/);
 assert.match(part,/STAGING_BACKUP_RESTORE_EVIDENCE/);
 assert.match(part,/npm run db:migrate/);
});
