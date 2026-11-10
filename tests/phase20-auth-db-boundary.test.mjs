import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const runtime=readFileSync("src/server/db/runtime-target.ts","utf8");
const runnable=runtime.slice(runtime.indexOf("export function assertRuntimeDatabaseTarget"))
  .replace("export function assertRuntimeDatabaseTarget(connectionString:string,env:RuntimeDatabaseEnvironment=process.env)",
    "function assertRuntimeDatabaseTarget(connectionString,env=process.env)")
  .replace("let url:URL;","let url;");
const scope={URL,process};
vm.runInNewContext(runnable+"\nthis.verify=assertRuntimeDatabaseTarget;",scope,{timeout:1500});
const verify=scope.verify;
const official="ematieqwxoiwoovmqdba";
const unrelated="abcdefghijklmnopqrst";
const stage="zyxwvutsrqponmlkjihg";
const env=(ref,vercelEnv="production")=>({
 VERCEL_ENV:vercelEnv,
 NEXT_PUBLIC_SUPABASE_URL:"https://"+ref+".supabase.co",
 SMART_HUB_PRODUCTION_SUPABASE_REF:ref
});
const db=ref=>"postgresql://postgres."+ref+":only_a_fake_password@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require";

test("Phase 20 accepts exact reviewed AgroChain V2 production Supabase project",()=>{
 assert.equal(verify(db(official),env(official)),official);
});
test("Phase 20 refuses self-consistent but UNREVIEWED production Supabase project",()=>{
 assert.throws(()=>verify(db(unrelated),env(unrelated)),/reviewed SmartHub AgroChain V2 project/);
});
test("Phase 20 rejects production DB pointed to another Supabase project",()=>{
 assert.throws(()=>verify(db(unrelated),env(official)),/configured TLS-enabled Supabase project/);
 assert.throws(()=>verify(db(official),{...env(official),SMART_HUB_PRODUCTION_SUPABASE_REF:unrelated}),/reviewed SmartHub AgroChain V2 project/);
});
test("Phase 20 preview still requires isolated stage and cannot reuse production",()=>{
 const preview={...env(official,"preview"),SMART_HUB_STAGE_SUPABASE_REF:stage};
 assert.throws(()=>verify(db(official),preview),/Preview/);
 assert.equal(verify(db(stage),{...preview,NEXT_PUBLIC_SUPABASE_URL:"https://"+stage+".supabase.co"}),stage);
});
test("Phase 20 authentication readiness uses SAME runtime project guard before creating any client",()=>{
 const source=readFileSync("src/server/auth/env.ts","utf8");
 const server=readFileSync("src/lib/supabase/server.ts","utf8");
 const identity=readFileSync("src/server/auth/context.ts","utf8");
 assert.match(source,/import \{ assertRuntimeDatabaseTarget \}/);
 assert.match(source,/assertRuntimeDatabaseTarget\(db\)/);
 assert.match(source,/\^sb_publishable_/);
 assert.match(source,/app\.origin===supabase\.origin/);
 assert.match(server,/if \(!authConfigReady\(\)\) throw/);
 assert.match(identity,/supabase\.auth\.getUser\(\)/);
 assert.doesNotMatch(identity,/supabase\.auth\.getSession\(\)/);
 assert.ok(source.indexOf("assertRuntimeDatabaseTarget(db)") < source.indexOf("return true;"));
 assert.doesNotMatch(source,/console\.log|SUPABASE_SECRET_KEY|PAYSTACK_SECRET_KEY|RELEASE_HEALTH_TOKEN/);
});
