import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
const read=path=>readFileSync(join(process.cwd(),path),"utf8");

test("all five roles have a dedicated navigation and workspace label",()=>{
 const navigation=read("src/components/dashboard/navigation.ts");
 for(const role of ["BUYER","FARMER","FIELD_AGENT","OPERATIONS","SUPER_ADMIN"]){
  assert.match(navigation,new RegExp(`\\b${role}:\\[`),`missing ${role} navigation`);
  assert.match(navigation,new RegExp(`\\b${role}:\\{title:`),`missing ${role} metadata`);
 }
});
test("planned modules are disabled, never rendered as actionable links",()=>{
 const nav=read("src/components/dashboard/dashboard-chrome.tsx");
 assert.match(nav,/item\.availability==="planned"/);
 assert.match(nav,/aria-disabled="true"/);
 assert.match(nav,/workspace-nav-soon/);
 assert.match(nav,/item\.href/);
 assert.match(read("src/components/dashboard/navigation.ts"),/availability:"planned"/);
});
test("role-specific workspaces derive actor from server-only trusted context",()=>{
 const shell=read("src/components/portal/portal-shell.tsx");
 assert.match(shell,/getAccountContext/);
 assert.match(shell,/mayAccess\(ctx,route\)/);
 assert.match(shell,/ctx\.account\.role/);
 const farmer=read("src/components/agriculture/portal-frame.tsx");
 assert.match(farmer,/getAccountContext/);
 assert.match(farmer,/accountDestination/);
 assert.match(farmer,/role!=="FARMER"/);
 assert.match(farmer,/DashboardFrame/);
});
test("navigation includes keyboard-operable mobile drawer and profile menu",()=>{
 const chrome=read("src/components/dashboard/dashboard-chrome.tsx");
 for(const t of ["aria-controls=","aria-expanded=","aria-current=","Escape","workspace-overlay","Skip to main content","aria-label=\"Breadcrumb\"","href=\"/logout\""])assert.ok(chrome.includes(t),t);
 assert.match(chrome,/setOpen\(false\)/);
});
test("shared workspace UI covers status semantics, empty, loading, error, and table",()=>{
 const ui=read("src/components/dashboard/dashboard-ui.tsx");
 for(const n of ["StatusPill","WorkspaceEmpty","WorkspaceLoading","WorkspaceTable","WorkspaceUnavailable"])assert.match(ui,new RegExp(n));
 assert.match(ui,/workspace-status--/);
 const error=read("src/components/dashboard/route-error.tsx");
 assert.match(error,/reset\(\)/);
 assert.doesNotMatch(error,/error\.message/);
 for(const role of ["dashboard","farmer","field-agent","operations","admin"]){
  assert.ok(existsSync(join(process.cwd(),`src/app/${role}/loading.tsx`)));
  assert.ok(existsSync(join(process.cwd(),`src/app/${role}/error.tsx`)));
 }
});
test("responsive styles include desktop/tablet/mobile and reduced-motion states",()=>{
 const css=read("src/app/globals.css");
 assert.match(css,/@media\(max-width:840px\)/);
 assert.match(css,/@media\(max-width:490px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/workspace-sidebar\.is-open/);
 assert.match(css,/workspace-profile-menu/);
});
