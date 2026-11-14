import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CI_DATABASE_URL,assertEphemeralCIEnvironment} from "../scripts/release/ci-postgres-guard.mjs";

const approved={
 GITHUB_ACTIONS:"true",
 GITHUB_REPOSITORY:"Maajolawasanjo/SmartHub-AgroChain",
 SMART_HUB_CI_POSTGRES_ONLY:"I_ACKNOWLEDGE_EPHEMERAL_POSTGRES",
 DIRECT_URL:CI_DATABASE_URL,
 DATABASE_URL:CI_DATABASE_URL
};
test("Phase20B: PostgreSQL integration requires exact disposable runner and URL",()=>{
 assert.equal(assertEphemeralCIEnvironment(approved),CI_DATABASE_URL);
 assert.match(CI_DATABASE_URL,/^postgresql:\/\/postgres:ci_only_ephemeral_password@127\.0\.0\.1:5432\/postgres\?sslmode=disable$/);
});
test("Phase20B: CI migration runner refuses external, real Supabase, Vercel, staging or missing approval",()=>{
 for(const patch of [
  {GITHUB_ACTIONS:"false"},
  {GITHUB_REPOSITORY:"Maajolawasanjo/smarthub-agronexus"},
  {SMART_HUB_CI_POSTGRES_ONLY:""},
  {DATABASE_URL:"postgresql://postgres:password@db.ematieqwxoiwoovmqdba.supabase.co:5432/postgres?sslmode=require"},
  {DIRECT_URL:"postgresql://postgres:password@db.ematieqwxoiwoovmqdba.supabase.co:5432/postgres?sslmode=require"},
  {DATABASE_URL:"postgresql://postgres:ci_only_ephemeral_password@localhost:5432/postgres?sslmode=disable"},
  {DATABASE_URL:"postgresql://postgres:ci_only_ephemeral_password@127.0.0.1:5433/postgres?sslmode=disable"},
  {VERCEL_ENV:"preview"},
  {SMART_HUB_PRODUCTION_SUPABASE_REF:"ematieqwxoiwoovmqdba"},
  {SMART_HUB_STAGE_SUPABASE_REF:"abcdefghijklmnopqrst"},
  {NEXT_PUBLIC_SUPABASE_URL:"https://ematieqwxoiwoovmqdba.supabase.co"},
  {SUPABASE_SECRET_KEY:"fake_secret"},
  {RELEASE_STAGE_CONFIRM:"I_ACKNOWLEDGE_STAGING_ONLY"}
 ]){
  assert.throws(()=>assertEphemeralCIEnvironment({...approved,...patch}),
    /Disposable PostgreSQL integration/,JSON.stringify(patch));
 }
});
test("Phase20B: workflow never supplies Supabase credentials to isolated database job",()=>{
 const yaml=readFileSync(".github/workflows/ci.yml","utf8");
 const job=yaml.slice(yaml.indexOf("  isolated_postgres:"));
 assert.match(job,/image: postgres:17/);
 assert.match(job,/SMART_HUB_CI_POSTGRES_ONLY: I_ACKNOWLEDGE_EPHEMERAL_POSTGRES/);
 assert.match(job,/node scripts\/release\/ci-postgres-integration\.mjs/);
 assert.match(job,/127\.0\.0\.1:5432/);
 assert.doesNotMatch(job,/\$\{\{\s*secrets\.|supabase\.co|smarthub-agronexus|deploy --prod|PRISMA_MIGRATE_PRODUCTION/);
});
test("Phase20B: isolated job executes real Prisma deploy with local schema stub and validates role denial",()=>{
 const src=readFileSync("scripts/release/ci-postgres-integration.mjs","utf8");
 assert.match(src,/assertEphemeralCIEnvironment\(\)/);
 assert.ok(src.indexOf("assertEphemeralCIEnvironment()")<src.indexOf("await usingClient"));
 assert.match(src,/\["migrate","deploy"\]/);
 assert.match(src,/CREATE ROLE anon NOLOGIN/);
 assert.match(src,/CREATE ROLE authenticated NOLOGIN/);
 assert.match(src,/CREATE SCHEMA storage/);
 assert.match(src,/CREATE TABLE storage\.buckets/);
 assert.match(src,/migration_name,checksum,finished_at,rolled_back_at/);
 assert.match(src,/relrowsecurity/);
 assert.match(src,/has_table_privilege/);
 assert.match(src,/SET ROLE/);
 assert.match(src,/error\?\.code==="42501"/);
 assert.match(src,/row\.public!==false/);
 assert.doesNotMatch(src,/SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|sk_live_|deleteProject|drop database/i);
});
