import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";

const ref="abcdefghijklmnopqrst";
const approved="SMART_HUB_PRODUCTION_SUPABASE_REF";
const direct="postgresql://postgres:example%23pass@db."+ref+".supabase.co:5432/postgres?sslmode=require";
const session="postgresql://postgres."+ref+":example%23pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";
const transaction=session.replace(":5432",":6543");
const run=patch=>{
 const env={PATH:process.env.PATH, [approved]:ref,...patch};
 return spawnSync(process.execPath,["scripts/release/require-migration-url.mjs"],
  {env,encoding:"utf8"});
};
test("migration safety check requires dedicated DIRECT_URL; never uses runtime DATABASE_URL",()=>{
 const result=run({DATABASE_URL:transaction});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/DIRECT_URL/);
 assert.doesNotMatch(result.stderr,/example%23pass/);
 const config=readFileSync("prisma.config.ts","utf8");
 assert.doesNotMatch(config,/process\.env\.DIRECT_URL\s*\|\|\s*process\.env\.DATABASE_URL/);
 const pkg=JSON.parse(readFileSync("package.json","utf8"));
 assert.match(pkg.scripts["db:migrate"],/require-migration-url\.mjs\s*&&\s*prisma migrate deploy/);
});
test("migration safety check accepts reviewed TLS direct and session-mode credentials",()=>{
 for(const DIRECT_URL of [direct,session]){
  const result=run({DIRECT_URL});
  assert.equal(result.status,0,result.stderr);
 }
});
test("migration safety check rejects wrong project and transaction pooler",()=>{
 for(const DIRECT_URL of [
  transaction,
  direct.replace(ref,"zyxwvutsrqponmlkjihg"),
  direct.replace("sslmode=require","sslmode=disable"),
  direct.replace(":5432",":6543"),
  "postgresql://user:pw@db.somewhere.com:5432/postgres?sslmode=require"
 ]){
  const result=run({DIRECT_URL});
  assert.notEqual(result.status,0);
  assert.doesNotMatch(result.stderr,/example%23pass/);
 }
});
test("migration safety check requires explicitly approved environment reference",()=>{
 const result=spawnSync(process.execPath,["scripts/release/require-migration-url.mjs"],
  {env:{PATH:process.env.PATH,DIRECT_URL:direct},encoding:"utf8"});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/approved staging or production/);
});
