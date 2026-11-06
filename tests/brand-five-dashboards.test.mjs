import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");
const global=read("src/app/globals.css");
const tokens=read("src/styles/dashboard-tokens.css");
const root=read("src/styles/brand-tokens.css");
const chrome=read("src/components/dashboard/dashboard-chrome.tsx");
const navigation=read("src/components/dashboard/navigation.ts");
const sections=[
 ["agro","/* Farmer and Operations workspaces:","/* Phase 01 — coherent"],
 ["workspace","/* Phase 01 — coherent","/* Phase 02 public"],
 ["staff","/* Phase 04 — staff governance","/* Phase 05 — Field Agent"],
 ["field","/* Phase 05 — Field Agent","/* Phase 18 — content-rich"],
];
function slice(start,end){
 const a=global.indexOf(start),b=global.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,"style section must exist: "+start);
 return global.slice(a,b);
}
const css=Object.fromEntries(sections.map(([name,a,b])=>[name,slice(a,b)]));

test("all five dashboard roles use one accessible chrome, sharing one Satoshi and forest-root design contract",()=>{
 for(const role of ["BUYER","FARMER","FIELD_AGENT","OPERATIONS","SUPER_ADMIN"]) {
  assert.match(navigation,new RegExp("\\b"+role+"\\b"));
  assert.match(navigation,new RegExp("\\b"+role+":\\{title:"));
 }
 assert.match(chrome,/return <div className="workspace-layout">/);
 assert.ok(chrome.includes('workspace-sidebar${open?'),"sidebar retains its dynamic mobile open state");
 assert.match(chrome,/className="workspace-page-heading"/);
 assert.match(chrome,/aria-current=\{active\?"page":undefined\}/);
 assert.match(chrome,/aria-expanded=\{open\}/);
 assert.match(chrome,/Skip to main content/);
 assert.match(global,/@import "\.\.\/styles\/dashboard-tokens\.css"/);
 for(const value of ["--dashboard-sidebar: var(--brand-forest)","--dashboard-surface-soft: var(--brand-sage)","--dashboard-canvas: var(--brand-ivory)","--dashboard-highlight: var(--brand-gold)","--dashboard-accent: var(--brand-agricultural)","--dashboard-heading: var(--brand-forest)"])
  assert.ok(tokens.includes(value),value);
 for(const value of ["#174C35","#D5A649","#E7EFE6","#F8F7F1","#398453"])
  assert.ok(root.includes(value),value);
});

test("all dashboard shells and shared UI use Satoshi, forest dark and semantic card/table colors",()=>{
 for(const name of ["agro","workspace","staff","field"])assert.match(css[name],/var\(--font-satoshi\)/,name);
 assert.match(css.workspace,/\.workspace-sidebar\{background:linear-gradient\([^}]*var\(--dashboard-sidebar\)/);
 assert.match(css.workspace,/\.workspace-topbar\{font-family:var\(--font-satoshi\);[^}]*background:var\(--dashboard-surface\)/);
 assert.match(css.workspace,/\.workspace-nav-item\.is-active\{background:var\(--dashboard-sidebar-active\);color:var\(--dashboard-sidebar-active-text\)/);
 assert.match(css.workspace,/\.workspace-card\{background:var\(--dashboard-surface\);[^}]*border-radius:var\(--dashboard-radius\)/);
 assert.match(css.workspace,/\.workspace-table th\{background:var\(--dashboard-surface-soft\)/);
 assert.match(css.workspace,/\.workspace-table tr:hover td\{background:var\(--dashboard-row-hover\)/);
 assert.match(css.workspace,/\.workspace-page-heading h1\{font-family:var\(--font-satoshi\);[^}]*font-weight:900/);
 assert.match(css.agro,/\.agro-sidebar\{background:var\(--brand-forest\)/);
 assert.match(css.agro,/\.agro-record\{background:var\(--dashboard-surface\)/);
 assert.match(css.staff,/\.staff-filter-form\{font-family:var\(--font-satoshi\)/);
 assert.match(css.field,/\.field-agent-detail-grid>div\{[^}]*var\(--dashboard-border\)/);
});

test("staff and field controls preserve usable keyboard focus, input height and mobile navigation",()=>{
 assert.match(tokens,/outline: 3px solid var\(--dashboard-focus\)/);
 assert.match(css.agro,/\.agro-field input,\.agro-field select,\.agro-field textarea\{font-family:var\(--font-satoshi\);min-height:44px/);
 assert.match(css.staff,/\.staff-field input,\.staff-field select,\.staff-field textarea\{font-family:var\(--font-satoshi\);min-height:44px/);
 assert.match(css.field,/\.field-agent-cancel-row input\{font-family:var\(--font-satoshi\);min-height:44px/);
 assert.match(css.workspace,/@media\(max-width:840px\)/);
 assert.match(css.agro,/@media\(max-width:850px\)/);
 assert.match(global,/prefers-reduced-motion/);
 assert.match(tokens,/prefers-reduced-motion: reduce/);
});

test("dashboard styling does not remove semantic error/warning states or authorization separation",()=>{
 assert.match(css.workspace,/\.workspace-status--warning\{/);
 assert.match(css.workspace,/\.workspace-status--negative\{/);
 assert.match(css.staff,/\.staff-danger-button\{/);
 assert.match(css.field,/\.field-agent-evidence-status/);
 assert.match(chrome,/\/logout/);
 assert.match(navigation,/Authorization always comes from server account records/);
 for(const name of ["agro","workspace","staff","field"])
  assert.doesNotMatch(css[name],/#(?:123d2b|0b2c20|e8b34f|1c2822)(?![0-9a-f])/i);
});
