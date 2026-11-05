import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const source=readFileSync("src/server/auth/context.ts","utf8");
const match=source.match(/export function mayAccess\([\s\S]*$/);
assert.ok(match,"Shared permission predicate must exist");
// Exercise the actual TypeScript predicate without importing server-only/Next.js modules.
const js=ts.transpileModule(match[0],{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
}).outputText;
const context={exports:{}};
vm.runInNewContext(js,context,{timeout:2000});
const mayAccess=context.exports.mayAccess;
const ctx=(role,status="ACTIVE",verified=true,phoneVerified=true)=>({
 account:{role,status,phone:"+2348012345678"},
 user:{email_confirmed_at:verified?"2026-11-05T12:00:00Z":null,
  phone_confirmed_at:phoneVerified?"2026-11-05T12:00:00Z":null,
  phone:phoneVerified?"+2348012345678":null}
});
test("unverified email and suspended users cannot reach any workspace",()=>{
 for(const role of ["BUYER","FARMER","FIELD_AGENT","OPERATIONS","SUPER_ADMIN"]){
  for(const route of ["/dashboard","/farmer","/field-agent","/operations","/admin"]){
   assert.equal(mayAccess(ctx(role,"ACTIVE",false),route),false);
   assert.equal(mayAccess(ctx(role,"SUSPENDED"),route),false);
  }
 }
});
test("farmer must have independently verified matching phone number",()=>{
 assert.equal(mayAccess(ctx("FARMER","ACTIVE",true,false),"/farmer"),false);
 const wrong=ctx("FARMER");wrong.user.phone="+2348099999999";
 assert.equal(mayAccess(wrong,"/farmer"),false);
 assert.equal(mayAccess(ctx("FARMER"),"/farmer"),true);
});
test("portal routes require correct DB role, with operations oversight",()=>{
 for(const [role,route] of [["BUYER","/dashboard"],["FARMER","/farmer"],
  ["FIELD_AGENT","/field-agent"],["OPERATIONS","/operations"],["SUPER_ADMIN","/admin"]]){
  assert.equal(mayAccess(ctx(role),route),true);
  assert.equal(mayAccess(ctx(role),route+"/settings"),true);
 }
 assert.equal(mayAccess(ctx("SUPER_ADMIN"),"/operations"),true);
 assert.equal(mayAccess(ctx("BUYER"),"/admin"),false);
 assert.equal(mayAccess(ctx("FARMER"),"/dashboard"),false);
 assert.equal(mayAccess(ctx("OPERATIONS"),"/admin"),false);
 assert.equal(mayAccess(ctx("SUPER_ADMIN"),"/dashboard"),false);
});
test("privileged path matching uses whole path segments",()=>{
 assert.equal(mayAccess(ctx("BUYER"),"/admin-extra"),true);
 assert.equal(mayAccess(ctx("BUYER"),"/operations-bypass"),true);
 assert.equal(mayAccess(ctx("BUYER"),"/field-agent-extra"),true);
 assert.equal(mayAccess(ctx("BUYER"),"/admin/users"),false);
});
