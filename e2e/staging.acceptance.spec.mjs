import {test,expect} from "@playwright/test";
import {assertStageTarget} from "../scripts/release/stage-target.mjs";
import {assessBrowserDenial} from "../scripts/release/staging-access-denial.mjs";

const {baseUrl}=assertStageTarget();
const roles={
 BUYER_A:{home:"/dashboard",name:"Buyer"},
 FARMER:{home:"/farmer",name:"Farmer"},
 FIELD_AGENT:{home:"/field-agent",name:"Field Agent"},
 OPERATIONS:{home:"/operations",name:"Operations"},
 SUPER_ADMIN:{home:"/admin",name:"Super Admin"}
};
const cookieFor=(role)=>process.env["STAGING_SESSION_"+role]??"";
function parseCookies(header){
 if(!header)throw new Error("A disposable staging session is required.");
 return header.split(";").map(s=>s.trim()).filter(Boolean).map(pair=>{
  const eq=pair.indexOf("=");
  if(eq<=0)throw new Error("Invalid cookie in ephemeral staging session.");
  return {name:pair.slice(0,eq),value:pair.slice(eq+1),url:baseUrl};
 });
}
async function rolePage(browser,role,viewport={width:1365,height:850}){
 const context=await browser.newContext({baseURL:baseUrl,viewport,ignoreHTTPSErrors:false,
  serviceWorkers:"block",storageState:{cookies:parseCookies(cookieFor(role)),origins:[]}});
 const page=await context.newPage();
 page.setDefaultNavigationTimeout(25000);
 return {context,page};
}

test.use({baseURL:baseUrl,screenshot:"off",trace:"off",video:"off"});
for(const [role,{home}] of Object.entries(roles)){
 test(role+" loads its own real workspace with a primary heading",async({browser})=>{
  const {context,page}=await rolePage(browser,role);
  try{
   const response=await page.goto(home);
   expect(response?.status(),"Account must load the permitted homepage").toBe(200);
   expect(new URL(page.url()).pathname).toBe(home);
   await expect(page.locator("h1").first()).toBeVisible();
  }finally{await context.close();}
 });
 test(role+" supports a narrow mobile viewport without page-wide horizontal overflow",async({browser})=>{
  const {context,page}=await rolePage(browser,role,{width:390,height:844});
  try{
   const response=await page.goto(home);
   expect(response?.status()).toBe(200);
   await expect(page.locator("h1").first()).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   expect(overflow,"Content must scroll within intended tables, not force the whole page sideways").toBeLessThanOrEqual(3);
   await page.keyboard.press("Tab");
   const focused=await page.evaluate(()=>document.activeElement?.tagName??"");
   expect(focused).not.toBe("BODY");
  }finally{await context.close();}
 });
}
// The review matrix matches the server-owned role boundary: Super Admin may
// enter Operations, but no other cross-role workspace access is permitted.
for(const [role] of Object.entries(roles)){
 test(role+" respects the real cross-role workspace access matrix",async({browser})=>{
  const {context,page}=await rolePage(browser,role);
  try{
   for(const [target,{home}] of Object.entries(roles)){
    if(role===target)continue;
    const response=await page.goto(home);
    if(role==="SUPER_ADMIN"&&target==="OPERATIONS"){
     expect(response?.status(),"Super Admin should be authorized in Operations").toBe(200);
     expect(new URL(page.url()).pathname).toBe(home);
     continue;
    }
    const denial=assessBrowserDenial(response?.status(),page.url(),home,baseUrl);
    expect(denial.ok,role+" must not access "+target+": "+denial.reason).toBe(true);
   }
  }finally{await context.close();}
 });
}
test("Buyer B cannot inspect Buyer A's physical shipment or private support conversation",async({browser})=>{
 const ids=[
  {id:process.env.STAGING_BUYER_A_SHIPMENT_ID,path:"/dashboard/shipments/"},
  {id:process.env.STAGING_BUYER_A_SUPPORT_CASE_ID,path:"/support/cases/"}
 ];
 const {context:ownerContext,page:owner}=await rolePage(browser,"BUYER_A");
 const {context:otherContext,page:other}=await rolePage(browser,"BUYER_B");
 try{
  for(const item of ids){
   expect(item.id,"Provision genuine Buyer A acceptance record").toMatch(/^[a-f0-9-]{36}$/i);
   const path=item.path+item.id;
   const ownResponse=await owner.goto(path),otherResponse=await other.goto(path);
   expect(ownResponse?.status(),"The selected record must belong to Buyer A").toBe(200);
   const denial=assessBrowserDenial(otherResponse?.status(),other.url(),path,baseUrl);
   expect(denial.ok,"Buyer B must not see Buyer A's private record: "+denial.reason).toBe(true);
  }
 }finally{await ownerContext.close();await otherContext.close();}
});
test("Super Admin can open real governance, report and read-only identity pages",async({browser})=>{
 const {context,page}=await rolePage(browser,"SUPER_ADMIN");
 try{
  for(const path of ["/admin/reports","/admin/governance","/admin/users","/admin/settings"]){
   const res=await page.goto(path);
   expect(res?.status(),path).toBe(200);
   await expect(page.locator("h1").first()).toBeVisible();
  }
 }finally{await context.close();}
});
test("Buyer and farmer can open private inbox, support and notification preferences",async({browser})=>{
 for(const role of ["BUYER_A","FARMER"]){
  const {context,page}=await rolePage(browser,role);
  try{
   for(const path of ["/inbox","/support","/settings/notifications"]){
    const response=await page.goto(path);
    expect(response?.status(),role+": "+path).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
   }
  }finally{await context.close();}
 }
});
