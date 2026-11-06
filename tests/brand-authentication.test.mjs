import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(p,"utf8");
const css=read("src/app/globals.css");
const root=read("src/styles/brand-tokens.css");
const live=read("src/features/auth/components/live-auth.tsx");
const preview=read("src/features/auth/components/auth-experience.tsx");
const ui=read("src/features/auth/components/auth-ui.tsx");
const start=css.indexOf("/* SmartHub authentication & account-lifecycle design system */");
const end=css.indexOf("/* Farmer and Operations workspaces",start);
assert.ok(start>=0&&end>start,"auth style region must exist");
const auth=css.slice(start,end);

test("live and design-preview auth flows use one shared Satoshi brand shell",()=>{
 for(const page of [live,preview]){
  for(const cls of ["auth-layout","auth-aside","auth-main","auth-heading","auth-card","auth-footer"])
   assert.ok(page.includes(cls),cls);
 }
 assert.match(auth,/\.auth-aside\{background:[^}]*var\(--brand-forest\)/);
 assert.match(auth,/\.auth-aside-main h2\{font-family:var\(--font-satoshi\);font-weight:900/);
 assert.match(auth,/\.auth-heading h1\{font-family:var\(--font-satoshi\);[^}]*font-weight:900/);
 assert.match(auth,/\.auth-logo\{font-family:var\(--font-satoshi\)/);
 assert.match(auth,/\.auth-card\{font-family:var\(--font-satoshi\)/);
});

test("account forms inherit canonical surfaces, border, focus and action tokens",()=>{
 assert.match(auth,/\.auth-layout\{[^}]*var\(--brand-ivory\)/);
 assert.match(auth,/\.auth-tabs\{[^}]*var\(--brand-sage\)/);
 assert.match(auth,/\.auth-input\{[^}]*var\(--border-subtle\)/);
 assert.match(auth,/\.auth-input:focus\{[^}]*var\(--focus-accent\)/);
 assert.match(auth,/\.auth-submit\{[^}]*var\(--brand-forest\)/);
 assert.match(auth,/\.auth-submit:hover:not\(:disabled\)\{background:var\(--brand-forest-hover\)/);
 assert.match(auth,/\.auth-submit:disabled\{opacity:/);
 assert.match(auth,/\.auth-reveal\{font-family:var\(--font-satoshi\)/);
 assert.match(auth,/\.auth-label\{font-weight:500/);
 assert.match(auth,/\.auth-tab\{[^}]*min-height:44px/);
 for(const token of ["--brand-forest: #174C35","--brand-gold: #D5A649","--brand-sage: #E7EFE6","--brand-ivory: #F8F7F1","--brand-agricultural: #398453"])
  assert.ok(root.includes(token),token);
});

test("auth shell contains no legacy primary colors or non-Satoshi typography",()=>{
 assert.doesNotMatch(auth,/#(?:123d2b|0b2c20|e8b34f|f5f7f5|1c2822|205b3d|ad7d22)\b/i);
 assert.doesNotMatch(auth,/Georgia|Times New Roman|font-family:\s*(?!var\(--font-satoshi\))/i);
 assert.match(auth,/@media\(max-width:880px\)/);
 assert.match(auth,/@media\(max-width:430px\)/);
});

test("auth security and usability contracts are untouched by branding",()=>{
 assert.match(ui,/aria-invalid=\{!!error\}/);
 assert.match(ui,/aria-describedby=\{error/);
 assert.match(ui,/role="alert"/);
 assert.match(ui,/type="submit"/);
 assert.match(live,/case "\/login":return <Login\/>/);
 assert.match(live,/case "\/forgot-password":return <EmailRecover\/>/);
 assert.match(live,/case "\/reset-password":return <Password\/>/);
 assert.match(live,/case "\/invite\/accept":case "\/invite\/profile":return <AcceptInvite\/>/);
 assert.match(preview,/ACCOUNT SERVICES NOT ENABLED/);
});

test("deletion status text uses the root semantic type-color token",()=>{
 const status=read("src/features/auth/components/deletion-status.tsx");
 assert.match(status,/text-\[var\(--text-muted\)\]/);
 assert.doesNotMatch(status,/#526858/);
});
