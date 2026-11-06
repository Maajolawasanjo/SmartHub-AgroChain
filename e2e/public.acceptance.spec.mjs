import {test,expect} from "@playwright/test";
import {mkdir} from "node:fs/promises";

const publicPages=[
 "/","/about","/product","/how-it-works","/for-buyers","/for-farmers",
 "/partnerships","/help","/faq","/contact","/products","/insights",
 "/privacy","/terms","/cookies","/accessibility"
];
test("all 16 public pages render one visible main heading without a 500 or empty body",async({page})=>{
 test.setTimeout(150000);
 for(const path of publicPages){
  const response=await page.goto(path,{waitUntil:"domcontentloaded"});
  expect(response?.status(),path+" must be public").toBe(200);
  await expect(page.locator("main h1").first(),path+" needs a clear page title").toBeVisible();
  await expect(page.locator("footer.public-footer"),path+" needs shared footer").toBeVisible();
 }
});

test("desktop hero, public story and photography render without placeholder boxes",async({page})=>{
 test.setTimeout(85000);
 await page.setViewportSize({width:1440,height:900});
 await page.goto("/",{waitUntil:"domcontentloaded"});
 await expect(page.getByRole("heading",{level:1})).toContainText("Connecting Agricultural Supply With Real Market Demand");
 await expect(page.locator(".editorial-audience-card")).toHaveCount(3);
 await expect(page.locator(".editorial-step")).toHaveCount(6);
 const hero=page.locator(".editorial-hero-visual img").first();
 await expect(hero).toBeVisible();
 await expect.poll(async()=>hero.evaluate(img=>img.complete&&img.naturalWidth>0),{
  timeout:40000,message:"Editorial hero image must load successfully through Next.js image optimization"
 }).toBe(true);
 await mkdir("playwright-artifacts",{recursive:true});
 await page.screenshot({path:"playwright-artifacts/desktop-home.png",fullPage:true,animations:"disabled"});
});

test("mobile navigation is usable and buyer/farmer CTAs lead to correct public routes",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/",{waitUntil:"domcontentloaded"});
 const summary=page.locator(".public-mobile-menu summary");
 await expect(summary).toBeVisible();
 await summary.click();
 await expect(page.getByRole("navigation",{name:"Mobile navigation"}).getByRole("link",{name:"For buyers"})).toBeVisible();
 await page.getByRole("navigation",{name:"Mobile navigation"}).getByRole("link",{name:"For buyers"}).click();
 await expect(page).toHaveURL(/\/for-buyers$/);
 await expect(page.locator("main h1")).toContainText("Agricultural sourcing");
 await page.goto("/for-farmers");
 await expect(page.locator("main h1")).toContainText("Your harvest");
});

test("mobile public pages have no global horizontal overflow",async({page})=>{
 test.setTimeout(135000);
 await page.setViewportSize({width:390,height:844});
 const paths=["/","/for-buyers","/for-farmers","/product","/how-it-works","/contact","/help","/partnerships"];
 await mkdir("playwright-artifacts",{recursive:true});
 for(const path of paths){
  await page.goto(path,{waitUntil:"domcontentloaded"});
  const width=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(width,path+" should fit mobile viewport").toBeLessThanOrEqual(3);
  if(["/","/for-buyers","/for-farmers","/contact"].includes(path)){
   const name=path==="/"? "home":path.slice(1);
   await page.screenshot({path:"playwright-artifacts/mobile-"+name+".png",fullPage:true,animations:"disabled"});
  }
 }
});
test("public contact accurately disables submission without configured database/anti-bot",async({page})=>{
 await page.goto("/contact?interest=farmer#contact-form");
 await expect(page.locator("#contact-role")).toHaveValue("farmer");
 await expect(page.getByRole("button",{name:"Send Message"})).toBeDisabled();
 await expect(page.getByText("Online submissions are not enabled yet")).toBeVisible();
 await expect(page.getByRole("link",{name:/info@smarthubagrochain\.online/i}).first()).toHaveAttribute("href","mailto:info@smarthubagrochain.online");
});
test("unconfigured catalogue and editorial pages never display invented operational entries",async({page})=>{
 await page.goto("/products");
 await expect(page.getByText("Published catalogue is not connected yet")).toBeVisible();
 await page.goto("/insights");
 await expect(page.getByText("Insights publishing is being prepared")).toBeVisible();
});
test("keyboard navigation exposes a working skip-to-main link",async({page})=>{
 await page.goto("/");
 await page.keyboard.press("Tab");
 await expect(page.locator(".public-skip-link")).toBeFocused();
 await page.keyboard.press("Enter");
 await expect(page.locator("#main-content")).toBeFocused();
});
test("unapproved legal notices are visible but not search-indexable",async({page})=>{
 for(const route of ["/privacy","/terms","/cookies"]){
  await page.goto(route);
  await expect(page.locator("main h1")).toBeVisible();
  const robots=await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots,route+" must not be indexed before legal signoff").toContain("noindex");
 }
});


test("desktop and mobile inherit the canonical Satoshi brand and readable surface palette",async({page})=>{
 test.setTimeout(100000);
 await mkdir("playwright-artifacts",{recursive:true});
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});
  const res=await page.goto("/",{waitUntil:"domcontentloaded"});
  expect(res?.status()).toBe(200);
  const branding=await page.evaluate(()=>{
   const r=getComputedStyle(document.documentElement);
   const body=getComputedStyle(document.body);
   const hero=getComputedStyle(document.querySelector(".editorial-hero h1"));
   const footer=getComputedStyle(document.querySelector("footer.public-footer"));
   return {
    forest:r.getPropertyValue("--brand-forest").trim().toLowerCase(),
    gold:r.getPropertyValue("--brand-gold").trim().toLowerCase(),
    sage:r.getPropertyValue("--brand-sage").trim().toLowerCase(),
    ivory:r.getPropertyValue("--brand-ivory").trim().toLowerCase(),
    agricultural:r.getPropertyValue("--brand-agricultural").trim().toLowerCase(),
    bodyFont:body.fontFamily,heroFont:hero.fontFamily,heroWeight:hero.fontWeight,
    footerBackground:footer.backgroundColor,
    focusLight:r.getPropertyValue("--focus-accent").trim(),
    focusDark:r.getPropertyValue("--focus-on-dark").trim()
   };
  });
  expect(branding.forest).toBe("#174c35");
  expect(branding.gold).toBe("#d5a649");
  expect(branding.sage).toBe("#e7efe6");
  expect(branding.ivory).toBe("#f8f7f1");
  expect(branding.agricultural).toBe("#398453");
  expect(branding.bodyFont).toContain("Satoshi");
  expect(branding.heroFont).toContain("Satoshi");
  expect(branding.heroWeight).toBe("900");
  expect(branding.footerBackground).toBe("rgb(23, 76, 53)");
  expect(branding.focusLight.toLowerCase()).toBe("#174c35");
  expect(branding.focusDark.toLowerCase()).toBe("#d5a649");
  await page.screenshot({path:"playwright-artifacts/brand-phase06-home-"+width+".png",fullPage:true,animations:"disabled"});
  await page.goto("/login",{waitUntil:"domcontentloaded"});
  await expect(page.locator(".auth-layout .auth-heading h1")).toBeVisible();
  const account=await page.locator(".auth-layout .auth-heading h1").evaluate(node=>({
    family:getComputedStyle(node).fontFamily,weight:getComputedStyle(node).fontWeight
  }));
  expect(account.family).toContain("Satoshi");
  expect(account.weight).toBe("900");
  await page.screenshot({path:"playwright-artifacts/brand-phase06-login-"+width+".png",fullPage:true,animations:"disabled"});
 }
});
