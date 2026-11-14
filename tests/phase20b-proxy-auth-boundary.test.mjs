import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {stripTypeScriptTypes} from "node:module";

// Exercise the actual Next.js proxy body with lightweight substitutes for its
// framework dependencies; never contact Supabase or an existing live tenant.
const source=readFileSync("src/proxy.ts","utf8");
const runnable=stripTypeScriptTypes(source
 .replace(/^import [^\n]+;\n/gm,"")
 .replace("export async function proxy","async function proxy")
 .replace("export const config=","const config="),{mode:"strip"});
function harness({ready=true,getClaimsThrows=false}={}){
 const calls={client:0,claims:0,requestCookies:[],responseCookies:[]};
 const request={cookies:{
  getAll:()=>[{name:"previous",value:"test-cookie"}],
  set:(name,value)=>calls.requestCookies.push({name,value}),
 }};
 const NextResponse={next:({request})=>({
  request,
  headers:new Map(),
  cookies:{set:(name,value,options)=>calls.responseCookies.push({name,value,options})},
 })};
 const createServerClient=(url,key,options)=>{
  calls.client++;
  assert.equal(url,"https://fake.example");
  assert.equal(key,"test-only-publishable");
  assert.deepEqual([...options.cookies.getAll()],[{name:"previous",value:"test-cookie"}]);
  return {auth:{getClaims:async()=>{
   calls.claims++;
   options.cookies.setAll([{name:"refreshed",value:"new-cookie",options:{httpOnly:true}}]);
   if(getClaimsThrows)throw Error("Fake provider outage");
   return {error:null,data:{claims:{sub:"not-an-authority"}}};
  }}};
 };
 const env={NEXT_PUBLIC_SUPABASE_URL:"https://fake.example",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"test-only-publishable"};
 const ctx={NextResponse,createServerClient,authConfigReady:()=>ready,
  process:{env}};
 vm.runInNewContext(runnable+"\nthis.proxyFn=proxy;this.routeConfig=config;",ctx,{timeout:1500});
 return {calls,request,proxy:ctx.proxyFn,config:ctx.routeConfig};
}
test("Phase 20B: failed V2 tenant readiness never starts a Supabase Auth client",async()=>{
 const app=harness({ready:false});
 const response=await app.proxy(app.request);
 assert.equal(app.calls.client,0);
 assert.equal(app.calls.claims,0);
 assert.equal(response.request,app.request);
 assert.deepEqual(app.calls.requestCookies,[]);
});
test("Phase 20B: correctly configured proxy preserves SSR refresh on both request and response",async()=>{
 const app=harness();
 const response=await app.proxy(app.request);
 assert.equal(app.calls.client,1);
 assert.equal(app.calls.claims,1);
 assert.deepEqual(app.calls.requestCookies,[{name:"refreshed",value:"new-cookie"}]);
 assert.equal(app.calls.responseCookies.length,1);
 assert.equal(app.calls.responseCookies[0].name,"refreshed");
 assert.equal(response.headers.get("Cache-Control"),"private, no-store");
});
test("Phase 20B: Auth outage does not break public rendering and cannot establish an authorized account",async()=>{
 const app=harness({getClaimsThrows:true});
 const response=await app.proxy(app.request);
 assert.equal(response.headers.get("Cache-Control"),"private, no-store");
 const guard=readFileSync("src/server/auth/context.ts","utf8");
 assert.match(guard,/supabase\.auth\.getUser\(\)/);
 assert.match(guard,/if \(error \|\| !data\.user\) return null/);
 assert.match(guard,/account\.status!==\"ACTIVE\"/);
 assert.doesNotMatch(source,/auth\.getSession\(\)/);
});
test("Phase 20B: proxy checks reviewed Auth/database identity BEFORE any provider operation",()=>{
 assert.match(source,/import \{ authConfigReady \} from \"@\/server\/auth\/env\"/);
 assert.ok(source.indexOf("if(!authConfigReady())")<source.indexOf("createServerClient(url,key"));
 assert.ok(source.indexOf("createServerClient(url,key")<source.indexOf("client.auth.getClaims()"));
 assert.doesNotMatch(source,/SUPABASE_SECRET_KEY|PAYSTACK_SECRET_KEY|DATABASE_URL/);
 const env=readFileSync("src/server/auth/env.ts","utf8");
 assert.match(env,/assertRuntimeDatabaseTarget\(db\)/);
 assert.match(readFileSync("src/server/db/runtime-target.ts","utf8"),/env\.VERCEL_ENV===\"preview\"/);
});
