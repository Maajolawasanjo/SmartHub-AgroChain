import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");
const root=read("src/styles/brand-tokens.css");
const dashboard=read("src/styles/dashboard-tokens.css");
const css=read("src/app/globals.css");
const layout=read("src/app/layout.tsx");

function color(token){
 const match=root.match(new RegExp("  "+token+":\\s*(#[0-9a-fA-F]{6});"));
 assert.ok(match,"Missing canonical color "+token);
 return match[1];
}
function channels(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function blend(a,b,part){
 const x=channels(a),y=channels(b);
 return "#"+x.map((v,i)=>Math.round(v*(1-part)+y[i]*part).toString(16).padStart(2,"0")).join("");
}
function luminosity(hex){
 const v=channels(hex).map(n=>n/255).map(n=>n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4));
 return v[0]*.2126+v[1]*.7152+v[2]*.0722;
}
function contrast(a,b){
 const x=luminosity(a),y=luminosity(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
const forest=color("--brand-forest");
const gold=color("--brand-gold");
const sage=color("--brand-sage");
const ivory=color("--brand-ivory");
const agricultural=color("--brand-agricultural");
const white="#ffffff";
const muted=blend(forest,white,.18);
const accentInk=blend(agricultural,forest,.35);
const goldOnDark=blend(gold,white,.10);
const forestDeep=blend(forest,"#000000",.15);

test("the canonical palette maintains WCAG AA normal-text contrast on its intended surfaces",()=>{
 for(const [name,foreground,background] of [
  ["Forest on Ivory",forest,ivory],
  ["Forest on Sage",forest,sage],
  ["Muted on Ivory",muted,ivory],
  ["Muted on Sage",muted,sage],
  ["Muted on White",muted,white],
  ["Agricultural ink on Ivory",accentInk,ivory],
  ["Agricultural ink on Sage",accentInk,sage],
  ["Agricultural ink on White",accentInk,white],
  ["Gold derived ink on dark Forest",goldOnDark,forest],
  ["Deep Forest ink on Gold button",forestDeep,gold],
 ])assert.ok(contrast(foreground,background)>=4.5,name+" contrast is "+contrast(foreground,background).toFixed(2));
 assert.match(root,/--brand-forest-muted: color-mix\(in srgb, var\(--brand-forest\), white 18%\)/);
 assert.match(root,/--brand-agricultural-ink: color-mix\(in srgb, var\(--brand-agricultural\), var\(--brand-forest\) 35%\)/);
 assert.match(root,/--brand-gold-on-dark: color-mix\(in srgb, var\(--brand-gold\), white 10%\)/);
 assert.match(dashboard,/--dashboard-accent: var\(--brand-agricultural-ink\)/);
});

test("focus rings stay visible against both light and dark brand surfaces",()=>{
 assert.ok(contrast(forest,ivory)>=3);
 assert.ok(contrast(forest,sage)>=3);
 assert.ok(contrast(gold,forest)>=3);
 assert.match(root,/--focus-accent: var\(--brand-forest\)/);
 assert.match(root,/--focus-on-dark: var\(--brand-gold\)/);
 assert.match(css,/\.auth-aside,\.workspace-sidebar,\.agro-sidebar,\.editorial-hero-dark,\.editorial-dark-section/);
 assert.match(css,/outline-color:var\(--focus-on-dark\)/);
 assert.match(css,/\.workspace-welcome \.workspace-cta\{background:var\(--brand-gold\);color:var\(--brand-forest-deep\)/);
});

test("editorial visuals follow approved colors and exclusive Satoshi heading weights",()=>{
 const start=css.indexOf("/* Phase 18 — content-rich public editorial system.");
 assert.ok(start>=0);
 const editorial=css.slice(start);
 assert.doesNotMatch(editorial,/#(?:d9ee88|d7ef93|d8ed91|e0f28e|dcec99|c9e798|d5ea90|c5e39b)\b/i);
 assert.match(editorial,/--ed-ink:var\(--brand-forest\)/);
 assert.match(editorial,/--ed-paper:var\(--brand-ivory\)/);
 assert.match(editorial,/--ed-gold:var\(--brand-gold\)/);
 assert.match(editorial,/\.editorial-hero h1\{font-family:var\(--font-satoshi\);[^}]*font-weight:900/);
 assert.match(editorial,/\.editorial-section-lead h2,[^{]*\{font-family:var\(--font-satoshi\);font-weight:700/);
 assert.match(editorial,/\.editorial-hero-dark \.editorial-button-primary,[^{]*\{background:var\(--brand-gold\);color:var\(--brand-forest-deep\)/);
 assert.doesNotMatch(editorial,/Georgia|Times New Roman|Manrope/i);
 assert.match(layout,/satoshi@300,400,500,700,900&display=swap/);
});

test("utility and account recovery copy inherit the same accessible root color",()=>{
 for(const path of [
  "src/app/not-found.tsx","src/components/section-page.tsx",
  "src/app/account/status/page.tsx","src/app/forgot-password/sent/page.tsx",
  "src/app/reset-password/success/page.tsx",
 ]){
  const source=read(path);
  assert.ok(source.includes("text-[var(--text-muted)]"),path);
  assert.ok(!source.includes("text-[#526858]"),path);
 }
});

test("semantic alerts, mobile breakpoints, and reduced motion remain intact",()=>{
 assert.match(css,/\.auth-notice-error\{/);
 assert.match(css,/\.workspace-status--warning\{/);
 assert.match(css,/\.workspace-status--negative\{/);
 assert.match(css,/\.staff-danger-button\{/);
 for(const breakpoint of ["max-width:840px","max-width:880px","max-width:640px","max-width:430px"])
  assert.ok(css.includes(breakpoint),breakpoint);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/\.editorial-dark-section,\.editorial-principle,\.editorial-ending-inner/);
});
