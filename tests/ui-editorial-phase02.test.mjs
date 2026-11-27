import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read = p => readFileSync(p,"utf8");
const css = read("src/styles/public-editorial.css");
test("public navigation keeps every destination and a mobile sourcing action",()=>{
 const h=read("src/components/site-header.tsx");
 for(const route of ["/product","/how-it-works","/for-buyers","/for-farmers","/products","/about","/help","/partnerships","/insights","/contact","/login","/contact?interest=buyer"])assert.ok(h.includes(route),route);
 assert.match(h,/className="public-menu-cta"/);
 assert.match(h,/<details className="public-mobile-menu">/);
 assert.match(css,/@media \(max-width: 1220px\)/);
 assert.match(css,/@media \(min-width: 1221px\)/);
});
test("shared public chrome and forms stay scoped and retain accessible controls",()=>{
 assert.match(css,/\.public-editorial \.public-footer \{/);
 assert.match(css,/\.public-editorial \.public-contact-form \{/);
 assert.match(css,/min-height: 48px;/);
 assert.match(css,/outline: 3px solid var\(--focus-accent\);/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
 assert.match(read("src/components/site-footer.tsx"),/<h2>Explore<\/h2>/);
 assert.match(read("src/components/public/contact-form.tsx"),/disabled=\{!enabled\|\|busy\}/);
});
