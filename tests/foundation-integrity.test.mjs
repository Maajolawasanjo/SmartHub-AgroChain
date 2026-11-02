import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("Prisma client, CLI and adapter are pinned to matching versions",()=>{
 const p=JSON.parse(read("package.json"));
 assert.equal(p.dependencies["@prisma/client"],p.devDependencies.prisma);
 assert.equal(p.dependencies["@prisma/adapter-pg"],p.devDependencies.prisma);
 assert.ok(p.dependencies.dotenv);
});
test("CI checks TypeScript, Prisma and build without live Supabase",()=>{
 const c=read(".github/workflows/ci.yml");
 for(const expected of ["npm ci","prisma validate","db:generate","typecheck","verify:syntax","npm run build","--require-lock"])assert.ok(c.includes(expected),expected);
 assert.doesNotMatch(c,/prisma migrate deploy|supabase db push/);
});
test("preflight, source parser and env template are included",()=>{
 assert.ok(existsSync("scripts/check-foundation.mjs"));
 assert.ok(existsSync("scripts/check-syntax.mjs"));
 assert.match(read("scripts/check-foundation.mjs"),/--require-lock/);
 assert.match(read(".env.example"),/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/);
});
