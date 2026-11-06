import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css=readFileSync("src/app/globals.css","utf8");
const token=readFileSync("src/styles/brand-tokens.css","utf8");
test("public shell inherits official primary forest instead of legacy colors",()=>{
 assert.match(css,/\.public-footer\{background:var\(--brand-forest\)/);
 assert.match(css,/\.public-header\{background:color-mix\(in srgb,var\(--brand-ivory\)/);
 assert.match(css,/\.public-desktop-nav a\{color:var\(--brand-forest\)/);
 assert.match(css,/\.public-login\{color:var\(--brand-forest\)/);
});
test("public marketing sections and catalogue use warm ivory sage and Satoshi",()=>{
 assert.match(css,/\.public-process-art\{[^}]*var\(--surface-card\)/);
 assert.match(css,/\.public-diagram-stage\{[^}]*var\(--brand-sage\)/);
 assert.match(css,/\.public-product-symbol\{[^}]*var\(--brand-sage\)/);
 assert.match(css,/\.public-product-content h3\{color:var\(--brand-forest\)/);
 assert.match(css,/\.public-feature-card\{[^}]*var\(--radius-card\)/);
 assert.match(css,/\.editorial-hero-dark\{[^}]*var\(--brand-forest\)/);
 assert.match(css,/\.editorial-hero h1\{font-family:var\(--font-satoshi\);[^}]*font-weight:900;[^}]*color:var\(--brand-forest\)/);
 for(const hex of ["#174C35","#D5A649","#E7EFE6","#F8F7F1","#398453"])assert.ok(token.includes(hex),hex);
});
test("the public site maintains functional focus and responsive support",()=>{
 assert.match(css,/\.public-mobile-menu\{/);
 assert.match(css,/\.public-header a:focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
});
