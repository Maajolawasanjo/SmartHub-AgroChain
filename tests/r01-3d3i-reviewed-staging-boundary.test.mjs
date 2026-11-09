import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {
  REVIEWED_PRODUCTION_SUPABASE_REF,
  REVIEWED_VERCEL_TEAM_SLUG,
  assertReviewedStagingProjectRefs
} from "../scripts/release/reviewed-environment-boundary.mjs";
import {assertMfaHttpStagingTarget} from "../scripts/release/check-stage-mfa-http-readonly.mjs";

const read=p=>readFileSync(p,"utf8");
const boundary=JSON.parse(read("docs/implementation/r01-3d3i-environment-boundary.json"));
const existing=read("docs/deployment/LIVE_SUPABASE_STATUS_2026_11_05.md");
const priorDecisions=JSON.parse(read("docs/implementation/r00-gates.json"));
const stageDb=read("scripts/release/stage-target.mjs");
const stageAuth=read("scripts/release/check-stage-mfa-readonly.mjs");
const stageHttp=read("scripts/release/check-stage-mfa-http-readonly.mjs");
const prod="ematieqwxoiwoovmqdba";
const stage="abcdefghijklmnopqrst";

test("R01.3D.3I reviewed production ref matches earlier SmartHub DB record; staging is not invented",()=>{
  assert.equal(REVIEWED_PRODUCTION_SUPABASE_REF,prod);
  assert.equal(boundary.production.supabaseProjectRef,prod);
  assert.equal(REVIEWED_VERCEL_TEAM_SLUG,"maajo-lawasanjos-projects");
  assert.match(existing,/Verified project: `ematieqwxoiwoovmqdba`/);
  assert.equal(boundary.staging.supabaseProjectRef,null);
  assert.equal(boundary.staging.vercelProjectId,null);
  assert.equal(boundary.staging.reviewedAppOrigin,null);
  assert.equal(boundary.staging.status,"NOT_FOUND_IN_CONNECTED_ACCOUNT");
  assert.equal(boundary.currentVercelConnection.smartHubProjectVisible,false);
  assert.ok(boundary.production.vercelProjectNames.includes("smarthub-agrochain-v2"));
  for(const id of ["R00-D01","R00-D04","R00-D09"])
    assert.equal(priorDecisions.gates.find(g=>g.id===id)?.status,"PENDING_OWNER_DECISION");
});

test("false positive staging identity from an arbitrary decoy production ref is refused",()=>{
  assert.deepEqual(assertReviewedStagingProjectRefs(stage,prod),{
    stagingProjectRef:stage,productionProjectRef:prod
  });
  assert.throws(()=>assertReviewedStagingProjectRefs(prod,stage),
    /Production project reference does not match/);
  assert.throws(()=>assertReviewedStagingProjectRefs(prod,prod),
    /Refusing to access the reviewed production/);
  assert.throws(()=>assertReviewedStagingProjectRefs(stage,"bcdefghijklmnopqrstu"),
    /Production project reference does not match/);
  assert.throws(()=>assertReviewedStagingProjectRefs("short",prod),
    /Staging Supabase project reference/);
});

test("database staging, provider MFA and app HTTP staging all share pinned registry guard",()=>{
  for(const source of [stageDb,stageAuth,stageHttp]){
    assert.match(source,/reviewed-environment-boundary\.mjs/);
    assert.match(source,/assertReviewedStagingProjectRefs\(/);
    assert.ok(source.indexOf("assertReviewedStagingProjectRefs(") <
      source.indexOf("new URL("),
      "The known production identity must be checked before parsing any target URL.");
  }
  assert.doesNotMatch(stageDb,/REF_OVERRIDE|SKIP_PROD|allowProduction|ALLOW_PROD_DB/);
  assert.doesNotMatch(stageAuth,/\.unenroll\(|\.challengeAndVerify\(|auth\.admin\./);
  assert.match(stageHttp,/method:"GET",redirect:"manual"/);
});

test("staging target cannot pretend production is another project even with fake approved R00 decisions",()=>{
  const base={
    RELEASE_STAGE_CONFIRM:"I_ACKNOWLEDGE_STAGING_ONLY",STAGING_MFA_TEST_ISOLATED:"true",
    SMART_HUB_STAGE_SUPABASE_REF:stage,
    SMART_HUB_PRODUCTION_SUPABASE_REF:prod,
    NEXT_PUBLIC_SUPABASE_URL:"https://"+stage+".supabase.co",
    STAGING_BASE_URL:"https://smarthub-staging.example.test",
    STAGING_REVIEWED_ORIGIN:"https://smarthub-staging.example.test",
    PRODUCTION_BASE_URL:"https://smarthub.example.test",
    PAYMENTS_ENABLED:"false",SUPPLIER_PAYOUTS_ENABLED:"false",PUBLIC_SIGNUP_ENABLED:"false",
    STAGING_MFA_HTTP_MODE:"baseline",
    STAGING_BUYER_A_SUPPORT_CASE_ID:"00000000-0000-4000-8000-000000000001",
    STAGING_OPERATIONS_OWN_SUPPORT_CASE_ID:"00000000-0000-4000-8000-000000000002",
    STAGING_SUPER_ADMIN_OWN_SUPPORT_CASE_ID:"00000000-0000-4000-8000-000000000003",
    STAGING_SUPPORT_INTERNAL_MARKER:"STAGING_NOTE_ONLY_1234567",
    STAGING_SESSION_BUYER_A:"fake-disposable-buyer-a-cookie",
    STAGING_SESSION_BUYER_B:"fake-disposable-buyer-b-cookie",
    STAGING_SESSION_OPERATIONS:"fake-disposable-ops-a-cookie",
    STAGING_SESSION_SUPER_ADMIN:"fake-disposable-admin-cookie"
  };
  assert.equal(assertMfaHttpStagingTarget(base,priorDecisions).mode,"baseline");
  assert.throws(()=>assertMfaHttpStagingTarget({
    ...base,
    SMART_HUB_STAGE_SUPABASE_REF:prod,
    SMART_HUB_PRODUCTION_SUPABASE_REF:stage,
    NEXT_PUBLIC_SUPABASE_URL:"https://"+prod+".supabase.co",
  },priorDecisions),/Production project reference does not match/);
  assert.throws(()=>assertMfaHttpStagingTarget({
    ...base,SMART_HUB_PRODUCTION_SUPABASE_REF:"bcdefghijklmnopqrstu"
  },priorDecisions),/Production project reference does not match/);
});

test("private connection strings and MFA secrets are absent from the nonsecret environment registry",()=>{
  const s=JSON.stringify(boundary);
  assert.doesNotMatch(s,/postgresql:\/\/|sb_secret_|sb_publishable_|BEGIN PRIVATE|Bearer |sk_(test|live)_/);
  assert.match(read(".github/workflows/staging-mfa-http-readonly.yml"),/environment: staging/);
  assert.match(read(".github/workflows/staging-mfa-readonly.yml"),/environment: staging/);
  assert.match(read(".github/workflows/staging-acceptance.yml"),/environment: staging/);
});
