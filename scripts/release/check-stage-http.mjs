import assert from "node:assert/strict";
import {ensureStageScriptEnvironment} from "./stage-target.mjs";

const cfg=ensureStageScriptEnvironment();
if(!cfg)process.exit(1);
const names=["BUYER_A","BUYER_B","FARMER","FIELD_AGENT","OPERATIONS","SUPER_ADMIN"];
const sessions=new Map(names.map(k=>[k,process.env["STAGING_SESSION_"+k]??""]));
for(const name of names)assert.ok(sessions.get(name),
 "A dedicated, disposable STAGING_SESSION_"+name+" cookie is required for full cross-role acceptance.");
const roles=["BUYER_A","FARMER","FIELD_AGENT","OPERATIONS","SUPER_ADMIN"];
const home={
 BUYER_A:"/dashboard",FARMER:"/farmer",FIELD_AGENT:"/field-agent",
 OPERATIONS:"/operations",SUPER_ADMIN:"/admin"
};
const errors=[];
async function get(path,role){
 const url=new URL(path,cfg.baseUrl);
 assert.equal(url.origin,cfg.baseUrl,"Smoke checks may not leave the reviewed staging origin.");
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),15000);
 try{
  return await fetch(url,{method:"GET",redirect:"manual",cache:"no-store",signal:controller.signal,
   headers:{"Cache-Control":"no-store",...(role?{Cookie:sessions.get(role)}:{})}});
 }finally{clearTimeout(timeout);}
}
const add=(name,actual,expect)=>{if(!expect(actual))errors.push(name+" (HTTP "+actual+")");};
for(const [role,path] of Object.entries(home)){
 const res=await get(path,role);
 add(role+" role authenticates to "+path,res.status,s=>s===200);
}
// All actors must be unable to view the other roles' workspace entrypoint.
for(const role of roles){
 for(const [target,path] of Object.entries(home)){
  if(target===role)continue;
  const res=await get(path,role);
  add(role+" must NOT access "+target+" workspace "+path,res.status,s=>s!==200);
 }
}
for(const path of ["/dashboard","/farmer","/field-agent","/operations","/admin","/inbox","/support"]){
 const res=await get(path);
 add("Anonymous must NOT access "+path,res.status,s=>s!==200);
}
const b=await get("/dashboard","BUYER_B");
add("Buyer B must have a working independent organization workspace",b.status,s=>s===200);
const adminExport=await get("/api/admin/reports/export?days=7","SUPER_ADMIN");
add("Super Admin aggregate CSV export",adminExport.status,s=>s===200);
if(adminExport.status===200){
 const ct=adminExport.headers.get("content-type")??"";
 if(!ct.startsWith("text/csv"))errors.push("Aggregate CSV response has an unexpected MIME type.");
 const csv=await adminExport.text();
 if(/recipientEncryptedNumber|payerEmail|SUPABASE_SECRET_KEY|accountNumber/.test(csv))
  errors.push("Unexpected identifier/secret column in aggregate CSV response.");
}
const opsExport=await get("/api/admin/reports/export?days=7","OPERATIONS");
add("Operations must not access Super Admin CSV",opsExport.status,s=>s!==200);
const anonExport=await get("/api/admin/reports/export?days=7");
add("Anonymous must not access CSV",anonExport.status,s=>s!==200);
// Independently provisioned buyer A and B MUST belong to different organizations.
// The following records must exist in A's organization; B is never permitted to view them.
for(const [envName,prefix] of [
 ["STAGING_BUYER_A_SHIPMENT_ID","/dashboard/shipments/"],
 ["STAGING_BUYER_A_SUPPORT_CASE_ID","/support/cases/"]
]){
 const recordId=process.env[envName];
 assert.match(recordId??"",/^[a-f0-9-]{36}$/i,envName+" must reference a genuine Buyer A staging record.");
 const url=prefix+recordId;
 const owner=await get(url,"BUYER_A"),other=await get(url,"BUYER_B");
 add("Buyer A can view own verified "+envName,owner.status,s=>s===200);
 add("Buyer B cannot view Buyer A "+envName,other.status,s=>s!==200);
}
if(errors.length){
 console.error("FAIL: cross-role HTTP acceptance:",errors.join(" | "));
 process.exitCode=1;
}else{
 console.log("PASS: authenticated role entrypoints, cross-role denies, anonymous denies, CSV RBAC, buyer A/B row isolation.");
 console.log("All checks were read-only GET requests; no payment, transfer, or business transitions were performed.");
}
