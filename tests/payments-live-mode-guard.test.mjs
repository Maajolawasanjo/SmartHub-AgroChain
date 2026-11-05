import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const source=readFileSync("src/server/payments/paystack.ts","utf8");
const start=source.indexOf("export function secretKey(){");
const end=source.indexOf("export function checkoutCallback()",start);
assert.ok(start>=0&&end>start);
const fn=source.slice(start,end).replace("export function secretKey()", "function secretKey()");
function check(env){
 class PublicError extends Error{constructor(status,message){super(message);this.status=status;}}
 const ctx={process:{env},PublicError,URL};
 const secretKey=vm.runInNewContext("("+fn+")",ctx,{timeout:1000});
 try{return {ok:true,key:secretKey()};}
 catch(err){return {ok:false,status:err.status,message:err.message};}
}
const base={NODE_ENV:"production",APP_BASE_URL:"https://smarthub.example",PRODUCTION_BASE_URL:"https://smarthub.example",PAYSTACK_LIVE_ENABLED:"true"};
test("live key requires explicit approval and exact production HTTPS origin",()=>{
 assert.equal(check({...base,PAYSTACK_SECRET_KEY:"sk_live_dummy123"}).ok,true);
 for(const change of [
  {PAYSTACK_LIVE_ENABLED:"false"},
  {PAYSTACK_LIVE_ENABLED:undefined},
  {NODE_ENV:"development"},
  {APP_BASE_URL:"https://staging.smarthub.example"},
  {PRODUCTION_BASE_URL:"https://another.example"},
  {PRODUCTION_BASE_URL:undefined},
  {APP_BASE_URL:"http://smarthub.example"},
  {PRODUCTION_BASE_URL:"http://smarthub.example"},
  {APP_BASE_URL:"https://smarthub.example/path"},
  {APP_BASE_URL:"https://smarthub.example?unexpected=1"}
 ]){
  const result=check({...base,...change,PAYSTACK_SECRET_KEY:"sk_live_dummy123"});
  assert.equal(result.ok,false,JSON.stringify(change));assert.equal(result.status,503);
  assert.doesNotMatch(result.message,/dummy123/);
 }
});
test("Paystack test key remains usable for isolated test transactions",()=>{
 const result=check({NODE_ENV:"development",PAYSTACK_SECRET_KEY:"sk_test_dummy123",APP_BASE_URL:"http://localhost:3000"});
 assert.equal(result.ok,true);
 assert.equal(result.key,"sk_test_dummy123");
});
test("invalid payment provider keys fail closed without echoing secrets",()=>{
 const result=check({...base,PAYSTACK_SECRET_KEY:"sk_prod_dummy123"});
 assert.equal(result.ok,false);assert.equal(result.status,503);
 assert.doesNotMatch(result.message,/dummy123/);
});
