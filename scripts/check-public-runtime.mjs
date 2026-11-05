import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";

// Local, non-production HTML smoke acceptance after "next build".
// No real Supabase project, payment credentials or contact delivery are required or used.
const port=Number(process.env.PUBLIC_SMOKE_PORT??3187);
const origin="http://127.0.0.1:"+port;
const publicPaths=[
 "/","/about","/product","/how-it-works","/for-buyers","/for-farmers",
 "/partnerships","/help","/faq","/contact","/products","/insights",
 "/privacy","/terms","/cookies","/accessibility"
];
const env={
 ...process.env,
 NODE_ENV:"production",
 DATABASE_URL:"",
 DIRECT_URL:"",
 PUBLIC_CONTACT_ENABLED:"false",
 PAYMENTS_ENABLED:"false",
 SUPPLIER_PAYOUTS_ENABLED:"false",
 PUBLIC_SIGNUP_ENABLED:"false",
 RELEASE_ACCEPTANCE_ENABLED:"false"
};
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--port",String(port)],{
 env,stdio:["ignore","pipe","pipe"]
});
let logs="";
child.stdout.on("data",d=>{logs+=String(d).slice(0,2500);});
child.stderr.on("data",d=>{logs+=String(d).slice(0,2500);});
const failed=[];
const request=async path=>{
 const response=await fetch(origin+path,{redirect:"manual",signal:AbortSignal.timeout(15000),
  headers:{"Cache-Control":"no-store"}});
 return {status:response.status,html:await response.text()};
};
async function ready(){
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw Error("Next server exited before readiness.");
  try{const r=await request("/");if(r.status===200)return;}catch{}
  await sleep(300);
 }
 throw Error("Next server did not serve an HTTP 200 homepage.");
}
try{
 await ready();
 const pages=new Map();
 for(const path of publicPaths){
  const result=await request(path);
  pages.set(path,result);
  if(result.status!==200)failed.push(path+" returned HTTP "+result.status);
  if(!/<h1(?:\s|>)/i.test(result.html))failed.push(path+" missing semantic H1");
  if(!result.html.includes('id="main-content"'))failed.push(path+" missing public skip-link target");
  if(!result.html.includes("SmartHub"))failed.push(path+" missing the site identity");
  if(!/<title>/i.test(result.html))failed.push(path+" missing rendered SEO title");
  if(!result.html.includes("public-footer"))failed.push(path+" missing global footer");
 }
 const home=pages.get("/")?.html??"";
 for(const route of ["/for-buyers","/for-farmers","/how-it-works","/partnerships","/products","/contact"]){
  if(!home.includes('href="'+route+'"'))failed.push("Homepage missing direct CTA or route "+route);
 }
 if(!home.includes("/_next/image?url="))failed.push("Optimized hero imagery is not present in homepage HTML.");
 const contact=pages.get("/contact")?.html??"";
 if(!contact.includes("Online submissions are not enabled yet"))
  failed.push("Contact page does not clearly disclose disabled submissions with unconfigured services.");
 if(!contact.includes('id="contact-form"')||!contact.includes('id="contact-options"'))
  failed.push("Contact page missing navigable enquiry or form anchor.");
 const products=pages.get("/products")?.html??"";
 if(!products.includes("Published catalogue is not connected yet"))
  failed.push("Unconfigured catalogue must not invent product stock.");
 const insights=pages.get("/insights")?.html??"";
 if(!insights.includes("Insights publishing is being prepared"))
  failed.push("Unconfigured editorial section must not invent published articles.");
 for(const p of ["/privacy","/terms","/cookies"]){
  const html=pages.get(p)?.html??"";
  if(!/<meta[^>]*name="robots"[^>]*noindex/i.test(html))
   failed.push("Unapproved "+p+" policy must remain noindexed.");
 }
 for(const [path,record] of pages){
  const anchors=[...record.html.matchAll(/<a\b[^>]*href="#([^"]+)"/gi)].map(m=>m[1]);
  for(const anchor of anchors){
   if(anchor&&!record.html.includes('id="'+anchor+'"'))
    failed.push(path+" has a broken same-page anchor #"+anchor);
  }
 }
 if(failed.length){
  console.error("FAIL: public SSR acceptance:",failed.join(" | "));
  process.exitCode=1;
 }else{
  console.log("PASS: 16 public Next.js SSR pages, visible SEO metadata, identity, optimized image output, legal gating and no-data empty states.");
  console.log("All probes used the local server with no database, live payments, contact delivery or real users.");
 }
}catch(error){
 console.error("Public SSR smoke failed:",error instanceof Error?error.message:"unknown error");
 console.error("Server output:",logs.slice(-1800));
 process.exitCode=1;
}finally{
 child.kill("SIGTERM");
 await Promise.race([new Promise(resolve=>child.once("exit",resolve)),sleep(3000)]);
 if(child.exitCode===null)child.kill("SIGKILL");
}
