import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("homepage uses the isolated cinematic hero and preserves the approved actions",()=>{
 const home=read("src/app/page.tsx");
 assert.match(home,/className="editorial-home"/);
 assert.match(home,/theme="dark" cinematic/);
 assert.match(home,/Connecting Agricultural Supply With <em>Real Market Demand<\/em>/);
 assert.match(home,/\/signup\?role=buyer/);
 assert.match(home,/\/signup\?role=farmer/);
 assert.match(home,/managedSteps.map/);
 assert.match(home,/Illustrative process · No live order data/);
 const hero=read("src/components/public/editorial.tsx");
 assert.match(hero,/fullBleed=\{cinematic\}/);
 assert.match(hero,/cinematic&&children/);
 assert.match(hero,/Not a photograph of SmartHub operations/);
});
test("homepage styling is scoped and retains mobile layout and content",()=>{
 const css=read("src/styles/public-editorial.css");
 assert.match(css,/\.public-editorial \.editorial-home \.editorial-hero-cinematic/);
 assert.match(css,/\.public-editorial \.editorial-home \.editorial-process-home/);
 assert.match(css,/@media \(max-width: 640px\)/);
 assert.match(css,/\.public-editorial \.editorial-home \.editorial-cinematic-note/);
 const e2e=read("e2e/public.acceptance.spec.mjs");
 assert.ok(e2e.includes('expect(branding.heroWeight).toBe("400")'));
 assert.ok(e2e.includes('expect(account.weight).toBe("900")'));
});
