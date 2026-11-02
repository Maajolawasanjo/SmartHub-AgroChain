import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
const root=process.cwd();
const load=p=>JSON.parse(readFileSync(join(root,p),"utf8"));
const states=load("src/features/auth/data/states.json");
const transitions=load("src/features/auth/data/transitions.json");
const paths=load("src/features/auth/data/routes.json");
const source=p=>readFileSync(join(root,p),"utf8");

test("all 144 approved and proposed states represented exactly once",()=>{
 assert.equal(states.length,144);
 assert.equal(new Set(states.map(x=>x.id)).size,144);
 assert.ok(states.every(x=>x.id&&x.module&&x.roles&&x.route&&x.name&&x.action&&x.basis&&x.test));
 assert.equal(new Set(states.map(x=>x.module)).size,11);
});
test("all 144 action-transition contracts associated with registry state",()=>{
 assert.equal(transitions.length,144);
 assert.deepEqual(new Set(transitions.map(x=>x.id)),new Set(states.map(x=>x.id)));
 assert.ok(transitions.every(x=>x.action&&x.next&&x.error&&x.test));
});
test("every one of the 48 documented authentication routes is an actual app route",()=>{
 assert.equal(paths.length,48);
 const normalized=new Set(states.map(x=>x.route.split("?")[0]));
 assert.deepEqual(new Set(paths),normalized);
 for(const path of normalized)assert.ok(existsSync(join(root,"src/app",path,"page.tsx")),`Missing ${path}`);
});
test("every authentication page mounts one shared flow boundary",()=>{
 for(const path of paths){
  const content=source(join("src/app",path,"page.tsx"));
  assert.ok(content.includes("<AuthPage route=") || ["/auth/redirect","/account/status","/forgot-password/sent","/reset-password/success"].includes(path),path);
 }
});
test("production preview registry is inaccessible",()=>{
 const preview=source("src/app/auth-preview/page.tsx");
 assert.match(preview,/NODE_ENV===\"production\"/);
 assert.match(preview,/notFound\(\)/);
 assert.match(source("src/features/auth/components/auth-experience.tsx"),/previewEnabled/);
});
test("no success claims or backend actions from frontend forms",()=>{
 const form=source("src/features/auth/components/auth-forms.tsx");
 assert.match(form,/nothing was sent, changed, saved, verified or deleted/);
 for(const bad of ["signInWithPassword","verifyOtp(","updateUser(","deleteUser(","admin.createUser(","localStorage.setItem("])assert.ok(!form.includes(bad),`Unexpected backend or local-auth shortcut: ${bad}`);
});
test("auth signup has approved registration fields and no privileged self-registration",()=>{
 const form=source("src/features/auth/components/auth-forms.tsx");
 for(const field of ["Farm name","FCT","Email address","Confirm password","Nigerian mobile","Terms of Service","Privacy Notice"])assert.ok(form.includes(field),`Missing ${field}`);
 assert.ok(!form.includes('option value="SUPER_ADMIN"'));
});
test("security-critical browser actions are explicitly unavailable",()=>{
 const experience=source("src/features/auth/components/auth-experience.tsx");
 assert.match(experience,/requires real authenticated authorization/);
 assert.match(experience,/safeInternalPath/);
 const generic=source("src/features/auth/components/auth-generic-actions.tsx");
 assert.match(generic,/no email, code, session, invitation, profile, account status or other record was changed/);
});
