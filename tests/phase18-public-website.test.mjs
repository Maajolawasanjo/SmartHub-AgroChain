import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const root="src/app/";
const publicRoutes=[
 "page.tsx","about/page.tsx","product/page.tsx","for-buyers/page.tsx",
 "for-farmers/page.tsx","how-it-works/page.tsx","partnerships/page.tsx",
 "help/page.tsx","contact/page.tsx","products/page.tsx","insights/page.tsx","faq/page.tsx"
];
test("Phase18 builds a complete core public site and new partnerships/help routes",()=>{
 for(const page of publicRoutes)assert.ok(existsSync(root+page),"Missing public page: "+page);
 for(const page of ["page.tsx","about/page.tsx","product/page.tsx","for-buyers/page.tsx",
  "for-farmers/page.tsx","how-it-works/page.tsx","partnerships/page.tsx","help/page.tsx","contact/page.tsx"]){
  const source=read(root+page);
  assert.match(source,/PublicShell/);
  assert.match(source,/Editorial/);
  assert.doesNotMatch(source,/MarketingPage/,"Do not regress to generic steps-only marketing template: "+page);
 }
});
test("Homepage is a complete content-rich design with distinct buyers, farmers, partners and physical fulfilment",()=>{
 const home=read(root+"page.tsx");
 for(const section of [
  "managed sourcing","audiences.map","managedSteps.map","/for-buyers","/for-farmers",
  "/partnerships","/products","/how-it-works","/contact","/faq",
  "independent payment","actual","EditorialHero","EditorialPhoto","EditorialCTA"
 ])assert.ok(home.toLowerCase().includes(section.toLowerCase()),section);
 assert.match(home,/Illustrative process/);
 assert.doesNotMatch(home,/100% success|10,000\+ farmers|guaranteed delivery|verified transactions today/i);
});
test("Dedicated role pages explain source records, conditions and non-guaranteed financial flows",()=>{
 const buyers=read(root+"for-buyers/page.tsx");
 const farmers=read(root+"for-farmers/page.tsx");
 const platform=read(root+"product/page.tsx");
 const process=read(root+"how-it-works/page.tsx");
 assert.match(buyers,/independent provider verification/i);
 assert.match(buyers,/quantity|quantities/);
 assert.match(farmers,/expected harvest/i);
 assert.match(farmers,/does not guarantee/i);
 assert.match(farmers,/approved|approvals/i);
 assert.match(platform,/Five clear workspaces/i);
 assert.match(platform,/Field Agents/);
 assert.match(platform,/Super Admin/);
 assert.match(process,/buyer|Buyers/i);
 assert.match(process,/payment/i);
 assert.match(process,/receipt/i);
});
test("Public contact form remains protected and openly disabled without configuration",()=>{
 const page=read(root+"contact/page.tsx");
 const form=read("src/components/public/contact-form.tsx");
 assert.match(page,/PUBLIC_CONTACT_ENABLED==="true"/);
 assert.match(page,/TURNSTILE_SECRET_KEY/);
 assert.match(page,/CONTACT_HASH_SECRET/);
 assert.match(page,/!!process\.env\.DATABASE_URL/);
 assert.match(page,/mailto:info@smarthubagrochain\.online/);
 assert.match(form,/if\(busy\|\|!enabled\)return/);
 assert.doesNotMatch(page,/fake success|sent successfully while disabled/);
});
test("No fabricated production statistics, supplier identities, prices or editorial articles",()=>{
 const src=publicRoutes.map(p=>read(root+p)).join("\n");
 assert.doesNotMatch(src,/10,000\+|5000 verified farmers|100% guaranteed|100% delivery|live orders today/i);
 assert.match(read(root+"products/page.tsx"),/publicProducts/);
 assert.match(read(root+"insights/page.tsx"),/publicArticles/);
 assert.match(read("src/lib/public/catalog.ts"),/publicPublished:true/);
 assert.match(read("src/lib/public/catalog.ts"),/published:true/);
});
test("Photography is explicitly illustrative, lazy loaded and has nonempty accessible alt text",()=>{
 const editorial=read("src/components/public/editorial.tsx");
 assert.match(editorial,/images\.unsplash\.com/);
 assert.match(editorial,/alt=\{item\.alt\}/);
 assert.match(editorial,/loading=\{priority\?"eager":"lazy"\}/);
 assert.match(editorial,/Not a photograph of SmartHub operations/);
 assert.doesNotMatch(editorial,/client|customer success|partner endorsement/i);
});
test("Mobile, reduced-motion and keyboard navigation receive deliberate styling",()=>{
 const css=read("src/app/globals.css");
 const header=read("src/components/site-header.tsx");
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/editorial-hero-grid/);
 assert.match(css,/editorial-audience-grid/);
 assert.match(header,/public-mobile-menu/);
 assert.match(header,/aria-label="Primary navigation"/);
 assert.match(header,/aria-label="Mobile navigation"/);
 assert.match(read("src/components/public-shell.tsx"),/public-skip-link/);
});
test("SEO and actual public navigation include help and partnerships, no broken placeholder landing routes",()=>{
 const header=read("src/components/site-header.tsx");
 const footer=read("src/components/site-footer.tsx");
 const sitemap=read("src/app/sitemap.ts");
 for(const p of ["/product","/how-it-works","/for-buyers","/for-farmers","/products","/about"]){
  assert.ok(header.includes(p),p);
  assert.ok(sitemap.includes(p),p);
 }
 for(const p of ["/help","/partnerships","/faq","/contact","/privacy","/terms"]){
  assert.ok(footer.includes(p),p);
 }
 assert.match(sitemap,/\/partnerships/);
 assert.match(sitemap,/\/help/);
});
test("Public legal copy remains gated until client approves real terms and privacy notices",()=>{
 const privacy=read(root+"privacy/page.tsx");
 const terms=read(root+"terms/page.tsx");
 assert.match(privacy,/has not yet been connected/);
 assert.match(terms,/have not yet been supplied/);
 assert.match(read(root+"faq/page.tsx"),/approved legal terms/);
});
