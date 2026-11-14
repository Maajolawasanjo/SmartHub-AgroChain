import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {stripTypeScriptTypes} from "node:module";

const raw=readFileSync("src/app/auth/callback/route.ts","utf8");
const compiled=stripTypeScriptTypes(
 raw.replace(/^import [^\n]+;\n/gm,"").replace(/\bexport\s+/g,""),
 {mode:"strip"});
const ownedOrigin="https://smarthub-agrochain-v2.vercel.app";

function harness({ready=true,verifyError=null,user={id:"00000000-0000-4000-8000-000000000100",email_confirmed_at:"2026-11-14T00:00:00Z"}}={}){
 const calls={client:0,verify:0,reconcile:0,ticket:0};
 const NextResponse={
  redirect:(url,options={})=>({kind:"redirect",status:307,url:String(url),headers:new Map(Object.entries(options.headers??{}))}),
  json:(body,options={})=>({kind:"json",status:options.status??200,body,headers:new Map(Object.entries(options.headers??{}))})
 };
 const ctx={URL,NextResponse,
  authConfigReady:()=>ready,
  siteUrl:()=>ownedOrigin,
  createSupabaseServerClient:async()=>{calls.client++;return{auth:{
   verifyOtp:async()=>{calls.verify++;return{error:verifyError};},
   getUser:async()=>({data:{user}})
  }};},
  reconcilePublicAccount:async()=>{calls.reconcile++;},
  setRecoveryTicket:async()=>{calls.ticket++;}
 };
 vm.runInNewContext(compiled+"\nthis.callback=GET;",ctx,{timeout:2000});
 const request=(url)=>({nextUrl:new URL(url)});
 return {calls,GET:ctx.callback,request};
}

const checkPolicy=(res)=>{
 assert.equal(res.headers.get("Cache-Control"),"private, no-store");
 assert.equal(res.headers.get("Referrer-Policy"),"no-referrer");
 assert.equal(res.headers.get("X-Robots-Tag"),"noindex, nofollow");
};
test("Phase 20B: misconfigured callback cannot reflect attacker-controlled Host or use Supabase",async()=>{
 const h=harness({ready:false});
 const res=await h.GET(h.request("https://attacker.invalid/auth/callback?token_hash=sensitive&link=https://attacker.invalid&type=recovery"));
 assert.equal(res.kind,"json");
 assert.equal(res.status,503);
 assert.equal(h.calls.client,0);
 assert.deepEqual(h.calls,{client:0,verify:0,reconcile:0,ticket:0});
 assert.doesNotMatch(JSON.stringify(res.body),/attacker|sensitive|token_hash/);
 checkPolicy(res);
});
test("Phase 20B: malformed, unknown or oversized token hashes never reach provider",async()=>{
 for(const params of ["", "?type=email", "?token_hash=x&type=phone_change",
  "?token_hash="+("a".repeat(513))+"&type=email", "?token_hash=x&type=unsupported"]){
  const h=harness();
  const res=await h.GET(h.request("https://attacker.invalid/auth/callback"+params));
  assert.equal(res.url,ownedOrigin+"/auth/error");
  assert.equal(h.calls.client,0);
  checkPolicy(res);
 }
});
test("Phase 20B: provider errors redirect only to owner-controlled error page",async()=>{
 for(const options of [{verifyError:{message:"bad token"}},{user:null}]){
  const h=harness(options);
  const res=await h.GET(h.request("https://attacker.invalid/auth/callback?token_hash=abc123&type=recovery"));
  assert.equal(res.url,ownedOrigin+"/auth/error");
  assert.equal(h.calls.client,1);
  assert.equal(h.calls.ticket,0);
  checkPolicy(res);
 }
});
test("Phase 20B: recovery, invitation and verification preserve owner origin and no-referrer policy",async()=>{
 for(const [type,path,reconciles,tickets] of [
  ["recovery","/reset-password",0,1],
  ["invite","/invite/accept",0,0],
  ["signup","/auth/redirect",1,0],
  ["email","/auth/redirect",1,0],
  ["email_change","/auth/redirect",1,0]
 ]){
  const h=harness();
  const res=await h.GET(h.request("https://attacker.invalid/auth/callback?token_hash=abc123&type="+type));
  assert.equal(res.url,ownedOrigin+path);
  assert.equal(h.calls.verify,1);
  assert.equal(h.calls.reconcile,reconciles);
  assert.equal(h.calls.ticket,tickets);
  checkPolicy(res);
 }
});
test("Phase 20B callback never derives a redirect from request.nextUrl.origin",()=>{
 assert.doesNotMatch(raw,/request\.nextUrl\.origin/);
 assert.match(raw,/if\(!authConfigReady\(\)\)/);
 assert.match(raw,/const origin=siteUrl\(\)/);
 assert.match(raw,/Referrer-Policy/);
 assert.match(raw,/Cache-Control/);
 assert.doesNotMatch(raw,/console\.log\(|console\.error\(|process\.env\.SUPABASE_SECRET_KEY/);
});
