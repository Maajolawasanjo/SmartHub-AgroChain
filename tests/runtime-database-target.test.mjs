import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source=readFileSync("src/server/db/runtime-target.ts","utf8");
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const context={exports:{},URL,process};
vm.runInNewContext(output.outputText,context,{timeout:1500});
const guard=context.exports.assertRuntimeDatabaseTarget;
const prod="ematieqwxoiwoovmqdba",stage="abcdefghijklmnopqrst";
const direct=ref=>"postgresql://postgres:password@db."+ref+".supabase.co:5432/postgres?sslmode=require";
const pooler=ref=>"postgresql://postgres."+ref+":password@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require";
const base={NEXT_PUBLIC_SUPABASE_URL:"https://"+prod+".supabase.co",SMART_HUB_PRODUCTION_SUPABASE_REF:prod,VERCEL_ENV:"production"};
const pass=(url,env)=>assert.equal(guard(url,env),new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.slice(0,20));
const fail=(url,env)=>assert.throws(()=>guard(url,env),/Supabase|Database|Production|Preview|staging/i);
test("runtime database accepts exact approved production Supabase direct and pooler targets",()=>{
 pass(direct(prod),base);pass(pooler(prod),base);
});
test("runtime database rejects wrong project, missing SSL, wrong username, unrelated Vercel database",()=>{
 for(const url of [direct(stage),pooler(stage),direct(prod).replace("sslmode=require","sslmode=disable"),direct(prod).replace("postgres:password","other:password"),"postgresql://postgres:password@db.other.example:5432/postgres?sslmode=require"])
  fail(url,base);
});
test("production requires an independently configured production ref",()=>{
 fail(direct(prod),{...base,SMART_HUB_PRODUCTION_SUPABASE_REF:undefined});
 fail(direct(prod),{...base,SMART_HUB_PRODUCTION_SUPABASE_REF:stage});
 fail(direct(prod),{...base,SMART_HUB_STAGE_SUPABASE_REF:prod});
});
test("preview must use distinct staging project, never production",()=>{
 const preview={...base,VERCEL_ENV:"preview",SMART_HUB_STAGE_SUPABASE_REF:stage};
 fail(direct(prod),preview);
 fail(direct(prod),{...base,VERCEL_ENV:"preview"});
 const correct={...preview,NEXT_PUBLIC_SUPABASE_URL:"https://"+stage+".supabase.co"};
 pass(direct(stage),correct);
 pass(pooler(stage),correct);
});
test("Prisma constructs no pool before validating the target",()=>{
 const prisma=readFileSync("src/server/db/prisma.ts","utf8");
 assert.match(prisma,/assertRuntimeDatabaseTarget\(connectionString\)/);
 assert.ok(prisma.indexOf("assertRuntimeDatabaseTarget(connectionString)")<prisma.indexOf("new PrismaPg"));
});
