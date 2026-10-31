import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync,readFileSync } from "node:fs";
import { join } from "node:path";
const root=process.cwd();
test("every public website entry route exists",()=>{
 for(const path of ["","product","products","how-it-works","for-buyers","for-farmers","about","contact","login","signup","terms","privacy"])assert.ok(existsSync(join(root,"src/app",path,"page.tsx")));
});
test("authentication routes delegate to the shared audited UI, not old inactive placeholders",()=>{
 for(const path of ["login","signup"]){const t=readFileSync(join(root,"src/app",path,"page.tsx"),"utf8");assert.match(t,/AuthPage/);}
});
test("no real credentials are embedded in environment example",()=>{
 const config=readFileSync(join(root,".env.example"),"utf8");assert.ok(!/eyJhbGciOi|sb_secret_|service_role|postgresql:\/\//.test(config));
});
test("Prisma database migration remains gated pending approval",()=>{
 const schema=readFileSync(join(root,"prisma/schema.prisma"),"utf8");assert.ok(!/^model\s+/m.test(schema));
});
