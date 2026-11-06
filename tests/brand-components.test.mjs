import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=path=>readFileSync(path,"utf8");
const css=read("src/styles/brand-components.css");
const global=read("src/app/globals.css");
const primitive=read("src/components/ui/brand.tsx");

test("shared component styles import after brand tokens, never introduce competing palettes",()=>{
 const token=global.indexOf('@import "../styles/brand-tokens.css"');
 const components=global.indexOf('@import "../styles/brand-components.css"');
 assert.ok(token>=0&&components>token,"shared primitives must inherit canonical palette");
 for(const selector of [".sh-button", ".sh-button--primary", ".sh-button--secondary", ".sh-button--quiet", ".sh-card", ".sh-card--sage", ".sh-field", ".sh-label", ".sh-input", ".sh-select", ".sh-textarea", ".sh-badge", ".sh-table-wrap", ".sh-table"])
  assert.ok(css.includes(selector),selector);
 for(const tokenName of ["brand-forest","brand-forest-hover","brand-gold","brand-sage","surface-card","border-subtle","text-primary","focus-accent","font-satoshi"])
  assert.ok(css.includes("var(--"+tokenName+")"),tokenName);
 assert.doesNotMatch(css,/#(?:123d2b|0b2c20|e8b34f|1c2822)\b/i);
});

test("components keep semantic native controls and actionable links",()=>{
 assert.match(primitive,/export function BrandLink/);
 assert.match(primitive,/return <Link \{\.\.\.props\}/);
 assert.match(primitive,/export function BrandButton/);
 assert.match(primitive,/type="button"/);
 assert.match(primitive,/return <button \{\.\.\.props\}/);
 assert.match(primitive,/export function BrandCard/);
 assert.match(primitive,/return <article \{\.\.\.props\}/);
 assert.match(primitive,/export function BrandField/);
 assert.match(primitive,/<label className="sh-label" htmlFor=\{htmlFor\}>/);
 assert.match(primitive,/export function BrandBadge/);
 assert.match(css,/min-height:\s*44px/);
 assert.match(css,/\.sh-button:focus-visible/);
 assert.match(css,/prefers-reduced-motion:\s*reduce/);
});

test("real public site and contact flow consume shared components without changing API contracts",()=>{
 const header=read("src/components/site-header.tsx");
 const editorial=read("src/components/public/editorial.tsx");
 const section=read("src/components/section-page.tsx");
 const form=read("src/components/public/contact-form.tsx");
 assert.match(header,/<BrandLink variant="primary"/);
 assert.match(editorial,/<BrandLink variant="secondary"/);
 assert.match(section,/<BrandCard key=\{item.title\}/);
 assert.match(section,/text-forest/);
 assert.match(form,/<BrandField htmlFor="contact-name"/);
 assert.match(form,/<BrandButton variant="primary"/);
 assert.match(form,/type="submit" disabled=\{!enabled\|\|busy\}/);
 for(const name of ["fullName","email","phone","organisation","audience","subject","message","productSlug","website"])
  assert.ok(form.includes('name="'+name+'"'),name);
 assert.match(form,/fetch\("\/api\/public\/enquiries"/);
 assert.match(form,/TURNSTILE|turnstile/);
 assert.match(form,/Your enquiry has been recorded/);
});

test("existing auth and operational portals use shared surfaces without changing page logic",()=>{
 for(const selector of [".auth-card", ".auth-input", ".agro-panel", ".agro-status", ".public-product-card", ".public-contact-form"])
  assert.ok(global.includes(selector),selector);
 assert.match(global,/\.auth-card\{[^}]*var\(--surface-card\)/);
 assert.match(global,/\.agro-panel\{[^}]*var\(--border-subtle\)/);
 assert.match(global,/\.public-product-card\{[^}]*var\(--radius-card\)/);
});
