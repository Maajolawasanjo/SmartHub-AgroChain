import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = name => readFileSync(name, "utf8");
const helperSource = read("src/server/communications/staff-mfa.ts");
const supportSource = read("src/server/communications/support.ts");
const supportListPage = read("src/app/support/page.tsx");
const supportDetailPage = read("src/app/support/cases/[id]/page.tsx");
const harnessSource = read("scripts/release/check-stage-mfa-readonly.mjs");
const workflowSource = read(".github/workflows/staging-mfa-readonly.yml");
const gates = JSON.parse(read("docs/implementation/r00-gates.json")).gates;

const policy = stripTypeScriptTypes(
  helperSource.replace(/^import .*\n/gm, "").replace(/^export /gm, ""),
  { mode: "strip" }
);
function makeSupportGate(opsEnforced, adminEnforced, result) {
  let observations = 0;
  const loader = new Function(
    "operationsMfaEnforcementEnabled", "privilegedMfaEnforcementEnabled",
    "inspectCurrentPrivilegedMfaAccess",
    policy+"\nreturn canReadPrivilegedSupportCases;"
  );
  return {
    check: loader(() => opsEnforced, () => adminEnforced, async () => {
      observations++;
      return result;
    }),
    get observations(){return observations;}
  };
}
const ctx = (role,patch={}) => ({
  account: {id:"signed-in-user",role,status:"ACTIVE"},
  user: {id:"signed-in-user",email_confirmed_at:"2026-11-09"},
  supabase:{auth:{mfa:{}}},
  ...patch
});

test("support reads retain owner scope for ordinary users and incomplete MFA sessions",async()=>{
  for(const role of ["BUYER","FARMER","FIELD_AGENT"]){
    const gate=makeSupportGate(true,true,{allowed:true});
    assert.equal(await gate.check(ctx(role)),false);
    assert.equal(gate.observations,0);
  }
  for(const role of ["OPERATIONS","SUPER_ADMIN"]){
    const inactive=makeSupportGate(true,true,{allowed:false,reason:"AAL2_REQUIRED"});
    assert.equal(await inactive.check(ctx(role)),false);
    assert.equal(inactive.observations,1);
    const unknown=makeSupportGate(true,true,{allowed:false,reason:"PROVIDER_UNAVAILABLE"});
    assert.equal(await unknown.check(ctx(role)),false);
    assert.equal(unknown.observations,1);
    const verified=makeSupportGate(true,true,{allowed:true,evidence:"CURRENT_AAL2_AND_VERIFIED_TOTP"});
    assert.equal(await verified.check(ctx(role)),true);
    assert.equal(verified.observations,1);
  }
});

test("unapproved MFA never queries factors or removes previously authorized staff read scope",async()=>{
  for(const role of ["OPERATIONS","SUPER_ADMIN"]){
    const gate=makeSupportGate(false,false,{allowed:false,reason:"PROVIDER_UNAVAILABLE"});
    assert.equal(await gate.check(ctx(role)),true);
    assert.equal(gate.observations,0);
  }
  const mixed=makeSupportGate(true,false,{allowed:false,reason:"AAL2_REQUIRED"});
  assert.equal(await mixed.check(ctx("OPERATIONS")),false);
  assert.equal(await mixed.check(ctx("SUPER_ADMIN")),true);
  assert.equal(mixed.observations,1);
  for(const invalid of [
    ctx("OPERATIONS",{account:{id:"signed-in-user",role:"OPERATIONS",status:"SUSPENDED"}}),
    ctx("SUPER_ADMIN",{user:{id:"wrong-user",email_confirmed_at:"2026-11-09"}}),
    ctx("SUPER_ADMIN",{user:{id:"signed-in-user",email_confirmed_at:null}}),
  ]){
    const gate=makeSupportGate(false,false,{allowed:true});
    assert.equal(await gate.check(invalid),false);
    assert.equal(gate.observations,0);
  }
});

test("support read services validate caller account against current Auth+DB account and restrict results",()=>{
  assert.match(supportSource,/async function trustedSupportReader\(expected:/);
  const readOnly=supportSource.slice(supportSource.indexOf("async function trustedSupportReader("));
  assert.match(readOnly,/const ctx=await requireWorkspaceAccount\(\)/);
  assert.match(readOnly,/ctx\.account\.id!==expected\.id \|\| ctx\.account\.role!==expected\.role/);
  assert.match(readOnly,/const staffView=await canReadPrivilegedSupportCases\(ctx\)/);
  assert.match(readOnly,/where:staffView\?\{\}:\{openedById:ctx\.account\.id\}/);
  assert.match(readOnly,/where:\{id,\.\.\.\(staffView\?\{\}:\{openedById:ctx\.account\.id\}\)\}/);
  assert.match(readOnly,/messages:\{where:staffView\?\{\}:\{internal:false\}/);
  assert.doesNotMatch(readOnly,/isStaff\(account\.role\)\?\{\}:\{openedById:account\.id\}/);
  assert.match(supportListPage,/const staff=await canReadPrivilegedSupportCases\(ctx\)/);
  assert.match(supportDetailPage,/const staff=await canReadPrivilegedSupportCases\(ctx\)/);
  assert.match(supportDetailPage,/canInternal=\{staff\}/);
});

const runnable = harnessSource
 .replace(/^import .*\n/gm,"")
 .split("\nif(process.argv[1]")[0]
 .replace(/^export /gm,"");
const staging = new Function("assert","createClient",
  runnable+"\nreturn {assertIsolatedMfaStage,inspectIsolatedMfaSessions};")(
    assert,()=>{throw new Error("Not used for offline configuration check");}
  );
const stageEnv = () => ({
  RELEASE_STAGE_CONFIRM:"I_ACKNOWLEDGE_STAGING_ONLY",
  STAGING_MFA_TEST_ISOLATED:"true",
  SMART_HUB_STAGE_SUPABASE_REF:"abcdefghijklmnopqrst",
  SMART_HUB_PRODUCTION_SUPABASE_REF:"bcdefghijklmnopqrstu",
  NEXT_PUBLIC_SUPABASE_URL:"https://abcdefghijklmnopqrst.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_an_isolated_test_key",
  PAYMENTS_ENABLED:"false",SUPPLIER_PAYOUTS_ENABLED:"false",
  STAGING_MFA_AAL1_ACCESS_TOKEN:"a".repeat(80),
  STAGING_MFA_AAL2_ACCESS_TOKEN:"b".repeat(80),
  STAGING_MFA_AAL1_EXPECTED_USER_ID:"00000000-0000-4000-8000-000000000001",
  STAGING_MFA_AAL2_EXPECTED_USER_ID:"00000000-0000-4000-8000-000000000002",
});

test("MFA stage harness rejects production host, shared ref, missing isolated approval and enabled payments",()=>{
  const good=staging.assertIsolatedMfaStage(stageEnv());
  assert.equal(good.url,"https://abcdefghijklmnopqrst.supabase.co");
  for(const changed of [
    {RELEASE_STAGE_CONFIRM:""},
    {STAGING_MFA_TEST_ISOLATED:"false"},
    {SMART_HUB_PRODUCTION_SUPABASE_REF:"abcdefghijklmnopqrst"},
    {NEXT_PUBLIC_SUPABASE_URL:"https://bcdefghijklmnopqrstu.supabase.co"},
    {NEXT_PUBLIC_SUPABASE_URL:"http://abcdefghijklmnopqrst.supabase.co"},
    {PAYMENTS_ENABLED:"true"},
    {SUPPLIER_PAYOUTS_ENABLED:"true"},
    {STAGING_MFA_AAL2_ACCESS_TOKEN:"a".repeat(80)},
    {STAGING_MFA_AAL1_ACCESS_TOKEN:""},
    {STAGING_MFA_AAL1_EXPECTED_USER_ID:""},
    {STAGING_MFA_AAL2_EXPECTED_USER_ID:stageEnv().STAGING_MFA_AAL1_EXPECTED_USER_ID},
  ]) assert.throws(()=>staging.assertIsolatedMfaStage({...stageEnv(),...changed}));
});

test("provider-backed staging acceptance requires two distinct validated user sessions and exact AAL levels",async()=>{
  const cfg=staging.assertIsolatedMfaStage(stageEnv());
  const observed=[];
  const factory=()=>({auth:{
    getUser:async token=>{
      observed.push("provider:get-user");
      return {data:{user:{
        id:token===cfg.aal1?cfg.expectedAal1UserId:cfg.expectedAal2UserId,
        email_confirmed_at:"2026-11-09T12:00:00Z",
        factors:[{factor_type:"totp",status:"verified"}]
      }},error:null};
    },
    mfa:{getAuthenticatorAssuranceLevel:async token=>{
      observed.push("provider:get-assurance");
      return {data:{
        currentLevel:token===cfg.aal1?"aal1":"aal2",
        nextLevel:"aal2",
        currentAuthenticationMethods:token===cfg.aal1?[{method:"password",timestamp:1}]:
          [{method:"mfa/totp",timestamp:2},{method:"password",timestamp:1}]
      },error:null};
    }}
  }});
  const res=await staging.inspectIsolatedMfaSessions(cfg,factory);
  assert.deepEqual(res,{
    status:"READ_ONLY_STAGING_MFA_OBSERVED",aal1:true,aal2:true,userCount:2,
    totpFactorAndChallengeVerified:true,
    liveRecoveryExercised:false,fullRoleAndRouteCoverageAccepted:false
  });
  assert.deepEqual(observed,[
    "provider:get-user","provider:get-assurance",
    "provider:get-user","provider:get-assurance"
  ]);
  await assert.rejects(staging.inspectIsolatedMfaSessions(cfg,()=>({auth:{
    getUser:async()=>({data:{user:{
      id:cfg.expectedAal1UserId,email_confirmed_at:"2026-11-09",
      factors:[{factor_type:"totp",status:"verified"}]}},error:null}),
    mfa:{getAuthenticatorAssuranceLevel:async token=>({
      data:{currentLevel:token===cfg.aal1?"aal1":"aal2",nextLevel:"aal2",
        currentAuthenticationMethods:token===cfg.aal1?["password"]:["totp"]},error:null
    })}
  }})),/session does not belong to its reviewed test identity/);
  await assert.rejects(staging.inspectIsolatedMfaSessions(cfg,()=>({auth:{
    getUser:async token=>({data:{user:{
      id:token===cfg.aal1?cfg.expectedAal1UserId:cfg.expectedAal2UserId,
      email_confirmed_at:"2026-11-09",
      factors:[{factor_type:"totp",status:"verified"}]}},error:null}),
    mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{
      currentLevel:"aal1",nextLevel:"aal2",
      currentAuthenticationMethods:["password"]},error:null})}
  }})),/current and next assurance levels/);
});

test("manual staging workflow cannot run MFA tests in production or mutate provider users",()=>{
  assert.match(workflowSource,/workflow_dispatch:/);
  assert.match(workflowSource,/environment: staging/);
  assert.match(workflowSource,/isolated_staging_confirmed/);
  assert.match(workflowSource,/STAGING_MFA_AAL1_ACCESS_TOKEN:/);
  assert.match(workflowSource,/STAGING_MFA_AAL2_ACCESS_TOKEN:/);
  assert.match(workflowSource,/STAGING_MFA_AAL1_EXPECTED_USER_ID:/);
  assert.match(workflowSource,/STAGING_MFA_AAL2_EXPECTED_USER_ID:/);
  assert.match(workflowSource,/PAYMENTS_ENABLED: "false"/);
  assert.match(workflowSource,/SUPPLIER_PAYOUTS_ENABLED: "false"/);
  assert.match(workflowSource,/node scripts\/release\/check-stage-mfa-readonly\.mjs/);
  assert.doesNotMatch(harnessSource,/\.enroll\(|\.unenroll\(|\.challengeAndVerify\(|\.verify\(|\.signInWithPassword\(|auth\.admin\.|\.updateUser\(|\.deleteUser\(/);
  assert.doesNotMatch(workflowSource,/prisma migrate|db:migrate|SUPABASE_SECRET_KEY:/);
  for(const id of ["R00-D01","R00-D04","R00-D09"])
    assert.equal(gates.find(x=>x.id===id)?.status,"PENDING_OWNER_DECISION");
});
