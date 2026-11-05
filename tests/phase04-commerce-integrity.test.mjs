import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {commerceInvariants,inspectCommerceInvariants} from "../scripts/release/commerce-invariants.mjs";

test("buyer farmer supply, order revision, and reservations have distinct checks",()=>{
 assert.equal(commerceInvariants.length,8);
 assert.equal(new Set(commerceInvariants.map(x=>x.id)).size,8);
 for(const c of commerceInvariants){
  assert.match(c.sql,/^SELECT COUNT\(\*\)::int AS n FROM public\./);
  assert.doesNotMatch(c.sql,/;|INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE/i);
 }
 const sql=commerceInvariants.map(x=>x.sql).join("\n");
 for(const t of ["buyer_memberships","supply_declarations","farms","buyer_requests","orders","quote_revisions","quote_lines","supply_lots","reservations"])
  assert.ok(sql.includes('public."'+t+'"'),t);
});
test("zero integrity violations pass and queries do not return business records",async()=>{
 const visited=[];
 const result=await inspectCommerceInvariants(async q=>{visited.push(q);return {rows:[{n:0}]};});
 assert.equal(result.ok,true);
 assert.equal(result.checks,8);
 assert.deepEqual(result.failures,[]);
 assert.equal(visited.length,8);
});
test("violations and invalid result counts fail closed",async()=>{
 let called=0;
 const result=await inspectCommerceInvariants(async()=>{
  called++;
  return {rows:[{n:called===3?2:called===5?null:0}]};
 });
 assert.equal(result.ok,false);
 assert.deepEqual(result.failures.map(x=>x.id),[commerceInvariants[2].id,commerceInvariants[4].id]);
});
test("database acceptance runs all checks inside its read-only transaction",()=>{
 const stage=readFileSync("scripts/release/check-stage-database.mjs","utf8");
 const production=readFileSync("scripts/release/check-production-preflight.mjs","utf8");
 for(const source of [stage,production]){
  assert.match(source,/BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/);
  assert.match(source,/inspectCommerceInvariants/);
  assert.match(source,/ROLLBACK/);
 }
 assert.match(production,/result\.state==="complete"/);
 assert.match(production,/!result\.ok\|\|!commerce\.ok/);
});
