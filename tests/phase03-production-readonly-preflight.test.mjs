import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assertProductionReadOnlyTarget} from "../scripts/release/production-readonly-target.mjs";
const ref="abcdefghijklmnopqrst", other="zyxwvutsrqponmlkjihg";
const approved="I_APPROVE_READONLY_PRODUCTION_INVENTORY";
const direct="postgresql://postgres:example%23password@db."+ref+".supabase.co:5432/postgres?sslmode=require";
const session="postgresql://postgres."+ref+":example%23password@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";
const env={RELEASE_PRODUCTION_READONLY_CONFIRM:approved,SMART_HUB_PRODUCTION_SUPABASE_REF:ref,
 NEXT_PUBLIC_SUPABASE_URL:"https://"+ref+".supabase.co",DIRECT_URL:direct,
 RELEASE_ACCEPTANCE_ENABLED:"false"};
const result=patch=>{try{return {ok:true,value:assertProductionReadOnlyTarget({...env,...patch})};}catch(e){return {ok:false,error:String(e.message)};}};
test("read-only production inventory requires explicit approval and exact Supabase project",()=>{
 assert.equal(result({}).ok,true);
 assert.equal(result({DIRECT_URL:session}).ok,true);
 for(const patch of [
  {RELEASE_PRODUCTION_READONLY_CONFIRM:""},
  {SMART_HUB_PRODUCTION_SUPABASE_REF:other},
  {NEXT_PUBLIC_SUPABASE_URL:"https://"+other+".supabase.co"},
  {NEXT_PUBLIC_SUPABASE_URL:"http://"+ref+".supabase.co"},
  {DIRECT_URL:direct.replace(ref,other)},
  {DIRECT_URL:session.replace(":5432",":6543")},
  {DIRECT_URL:direct.replace("sslmode=require","sslmode=disable")},
  {RELEASE_ACCEPTANCE_ENABLED:"true"},
 ]){const r=result(patch);assert.equal(r.ok,false);assert.doesNotMatch(r.error,/example%23password/);}
});
test("production inventory is provably read-only and has no migration commands",()=>{
 const script=readFileSync("scripts/release/check-production-preflight.mjs","utf8");
 assert.match(script,/BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/);
 assert.match(script,/ROLLBACK/);
 assert.match(script,/assertProductionReadOnlyTarget/);
 assert.match(script,/assessStageInventory/);
 assert.doesNotMatch(script,/migrate deploy|db push|migrate reset|INSERT INTO|UPDATE\s+public\.|DELETE FROM/);
 assert.doesNotMatch(script,/console\.log\([^\n]*connectionString/);
});
