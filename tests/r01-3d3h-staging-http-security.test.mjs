import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  assertMfaHttpStagingTarget,
  inspectMfaStageHttp,
  requestStagingPage
} from "../scripts/release/check-stage-mfa-http-readonly.mjs";

const read=p=>readFileSync(p,"utf8");
const decisions=JSON.parse(read("docs/implementation/r00-gates.json"));
const script=read("scripts/release/check-stage-mfa-http-readonly.mjs");
const workflow=read(".github/workflows/staging-mfa-http-readonly.yml");
const manifest=JSON.parse(read("docs/implementation/r01-3d3g-mfa-acceptance-manifest.json"));
const uuid=(n)=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0");
const cookies={
  BUYER_A:"staging-cookie-buyera-xyz",
  BUYER_B:"staging-cookie-buyerb-xyz",
  OPERATIONS:"staging-cookie-operations-xyz",
  SUPER_ADMIN:"staging-cookie-superadmin-xyz",
  OPERATIONS_AAL1:"staging-cookie-ops-aal1-xyz",
  OPERATIONS_AAL2:"staging-cookie-ops-aal2-xyz",
  SUPER_ADMIN_AAL1:"staging-cookie-admin-aal1-xyz",
  SUPER_ADMIN_AAL2:"staging-cookie-admin-aal2-xyz"
};
const env=()=>({
  RELEASE_STAGE_CONFIRM:"I_ACKNOWLEDGE_STAGING_ONLY",
  STAGING_MFA_TEST_ISOLATED:"true",
  SMART_HUB_STAGE_SUPABASE_REF:"abcdefghijklmnopqrst",
  SMART_HUB_PRODUCTION_SUPABASE_REF:"ematieqwxoiwoovmqdba",
  NEXT_PUBLIC_SUPABASE_URL:"https://abcdefghijklmnopqrst.supabase.co",
  STAGING_BASE_URL:"https://smarthub-staging.example.test",
  STAGING_REVIEWED_ORIGIN:"https://smarthub-staging.example.test",
  PRODUCTION_BASE_URL:"https://smarthub.example.test",
  PAYMENTS_ENABLED:"false",
  SUPPLIER_PAYOUTS_ENABLED:"false",
  PUBLIC_SIGNUP_ENABLED:"false",
  STAGING_MFA_HTTP_MODE:"baseline",
  STAGING_MFA_HTTP_ENFORCEMENT_APPROVED:"false",
  STAGING_BUYER_A_SUPPORT_CASE_ID:uuid(1),
  STAGING_OPERATIONS_OWN_SUPPORT_CASE_ID:uuid(2),
  STAGING_SUPER_ADMIN_OWN_SUPPORT_CASE_ID:uuid(3),
  STAGING_SUPPORT_INTERNAL_MARKER:"SECURITY_TEST_NOTE_987654321",
  ...Object.fromEntries(Object.entries(cookies).map(([k,v])=>["STAGING_SESSION_"+k,v]))
});
const approved={
  gates:decisions.gates.map(item=>["R00-D01","R00-D04","R00-D09"].includes(item.id)
    ?{...item,status:"APPROVED",decision_record_ref:"independently-signed-record",
      approved_by:"security-owner",approved_at:"2026-11-09T11:00:00Z"}:item)
};
const response=(status,body="",location=null)=>({
  status,headers:{get:(name)=>name.toLowerCase()==="location"?location:null},
  text:async()=>body
});
const createTransport=(target,{leak=false,wrongRole=false}={})=>{
  const log=[];
  const transport=async(url,options)=>{
    log.push({url:String(url),method:options.method,redirect:options.redirect,headers:options.headers});
    const u=new URL(url);
    const c=options.headers?.Cookie;
    const buyer=u.pathname==="/support/cases/"+target.fixture.buyerCase;
    const opsCase=u.pathname==="/support/cases/"+target.fixture.operationsOwnCase;
    const adminCase=u.pathname==="/support/cases/"+target.fixture.adminOwnCase;
    const ao1=c===cookies.OPERATIONS_AAL1,ao2=c===cookies.OPERATIONS_AAL2;
    const aa1=c===cookies.SUPER_ADMIN_AAL1,aa2=c===cookies.SUPER_ADMIN_AAL2;
    const ba=c===cookies.BUYER_A,bb=c===cookies.BUYER_B;
    const ops=c===cookies.OPERATIONS;
    const admin=c===cookies.SUPER_ADMIN;
    if(buyer){
      if(ba)return response(200,"<main>Buyer own public thread "+(leak?target.fixture.internalMarker:"")+"</main>");
      if(ao1||aa1||bb)return response(404);
      if(ao2||aa2||ops||admin)return response(200,
        "<main>Customer case. Internal staff note "+target.fixture.internalMarker+"</main>");
      return response(307,"","/login");
    }
    if(opsCase) {
      if(ao1||ao2||ops||admin||aa2)return response(200,"<main>Operations own case</main>");
      return response(404);
    }
    if(adminCase) {
      if(aa1||aa2||admin||ops||ao2)return response(200,"<main>Admin own case</main>");
      return response(404);
    }
    if(u.pathname==="/api/admin/reports/export"){
      if(admin||aa2||(wrongRole&&ops))return response(200,"csv-header");
      if(!c)return response(401);
      return response(403);
    }
    if(u.pathname==="/admin"){
      if(aa1)return response(307,"","/account/security/mfa");
      if(aa2||admin)return response(200,"Admin");
      return response(403);
    }
    if(u.pathname==="/operations"){
      if(ao1)return response(307,"","/account/security/operations-mfa");
      if(ao2||ops||admin||aa2)return response(200,"Operations");
      return response(403);
    }
    if(u.pathname==="/support"&&!c)return response(307,"","/login");
    throw Error("Unexpected test endpoint");
  };
  return {transport,log};
};

test("R01.3D.3H stage target fails closed for production, wrong origin, disabled consent, leaked cookies",()=>{
  const good=assertMfaHttpStagingTarget(env(),decisions);
  assert.equal(good.origin,"https://smarthub-staging.example.test");
  assert.equal(good.mode,"baseline");
  for(const alteration of [
    {RELEASE_STAGE_CONFIRM:""},
    {STAGING_MFA_TEST_ISOLATED:"false"},
    {SMART_HUB_PRODUCTION_SUPABASE_REF:"abcdefghijklmnopqrst"},
    {NEXT_PUBLIC_SUPABASE_URL:"https://bcdefghijklmnopqrstu.supabase.co"},
    {STAGING_BASE_URL:"https://smarthub.example.test",STAGING_REVIEWED_ORIGIN:"https://smarthub.example.test"},
    {STAGING_BASE_URL:"http://smarthub-staging.example.test"},
    {STAGING_REVIEWED_ORIGIN:"https://another-staging.example.test"},
    {STAGING_MFA_HTTP_MODE:"unknown"},
    {PAYMENTS_ENABLED:"true"},
    {SUPPLIER_PAYOUTS_ENABLED:"true"},
    {PUBLIC_SIGNUP_ENABLED:"true"},
    {STAGING_SESSION_BUYER_B:cookies.BUYER_A},
    {STAGING_SESSION_OPERATIONS:"token\nX-Injected: abc"},
    {STAGING_BUYER_A_SUPPORT_CASE_ID:"invalid"},
    {STAGING_SUPPORT_INTERNAL_MARKER:""},
    {STAGING_OPERATIONS_OWN_SUPPORT_CASE_ID:uuid(1)}
  ]) assert.throws(()=>assertMfaHttpStagingTarget({...env(),...alteration},decisions));
});

test("enforced staging checks cannot run until signed R00-D01/D04/D09 and separately reviewed cookies",()=>{
  const requested={...env(),STAGING_MFA_HTTP_MODE:"enforced",
    STAGING_MFA_HTTP_ENFORCEMENT_APPROVED:"true"};
  assert.throws(()=>assertMfaHttpStagingTarget(requested,decisions),/unapproved owner decision/);
  assert.throws(()=>assertMfaHttpStagingTarget({
    ...requested,STAGING_SESSION_SUPER_ADMIN_AAL1:""
  },approved),/cookie missing/);
  const accepted=assertMfaHttpStagingTarget(requested,approved);
  assert.equal(accepted.mode,"enforced");
  assert.equal(new Set(Object.values(accepted.sessions)).size,8);
});

test("baseline fixture proves signed-in row isolation, anonymous denial and CSV role separation without mutations",async()=>{
  const stage=assertMfaHttpStagingTarget(env(),decisions);
  const {transport,log}=createTransport(stage);
  const outcome=await inspectMfaStageHttp(stage,transport);
  assert.equal(outcome.status,"READ_ONLY_HTTP_CHECKS_PASSED");
  assert.equal(outcome.mode,"baseline");
  assert.equal(outcome.checks,13);
  assert.deepEqual(outcome.failures,[]);
  assert.equal(outcome.authorizesActivation,false);
  assert.equal(outcome.provesProviderMfa,false);
  assert.equal(outcome.provesRecovery,false);
  assert.ok(log.every(c=>c.method==="GET"&&c.redirect==="manual"));
  assert.ok(log.every(c=>c.url.startsWith(stage.origin+"/")));
  assert.ok(log.every(c=>!c.headers.Authorization));
});

test("enforced fixture tests AAL1 locked staff workspace, owner recovery and AAL2 internal case access",async()=>{
  const stage=assertMfaHttpStagingTarget({...env(),
    STAGING_MFA_HTTP_MODE:"enforced",STAGING_MFA_HTTP_ENFORCEMENT_APPROVED:"true"},approved);
  const {transport,log}=createTransport(stage);
  const outcome=await inspectMfaStageHttp(stage,transport);
  assert.equal(outcome.status,"READ_ONLY_HTTP_CHECKS_PASSED");
  assert.equal(outcome.checks,25);
  assert.deepEqual(outcome.failures,[]);
  assert.ok(log.every(x=>x.method==="GET"&&x.redirect==="manual"));
});

test("private support notes and wrong-role Admin CSV leaks fail acceptance",async()=>{
  const stage=assertMfaHttpStagingTarget(env(),decisions);
  const leaked=await inspectMfaStageHttp(stage,createTransport(stage,{leak:true}).transport);
  assert.equal(leaked.status,"FAIL");
  assert.ok(leaked.failures.some(x=>x.includes("private internal support note")));
  const elevated=await inspectMfaStageHttp(stage,createTransport(stage,{wrongRole:true}).transport);
  assert.equal(elevated.status,"FAIL");
  assert.ok(elevated.failures.some(x=>x.includes("Operations Admin CSV")));
});

test("HTTP execution refuses cross-origin before connecting and never follows redirects",async()=>{
  const stage=assertMfaHttpStagingTarget(env(),decisions);
  const transport=createTransport(stage).transport;
  await assert.rejects(requestStagingPage(stage,"https://different.example.test/admin",
    cookies.SUPER_ADMIN,transport),/Never allow the test/);
});

test("manual workflow is staging-only, GET-only and does not create Auth or DB mutations",()=>{
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/environment: staging/);
  assert.match(workflow,/STAGING_MFA_HTTP_MODE:/);
  assert.match(workflow,/STAGING_MFA_HTTP_ENFORCEMENT_APPROVED:/);
  assert.match(workflow,/STAGING_SESSION_SUPER_ADMIN_AAL1:/);
  assert.match(workflow,/STAGING_SESSION_SUPER_ADMIN_AAL2:/);
  assert.match(workflow,/STAGING_SUPPORT_INTERNAL_MARKER:/);
  assert.match(workflow,/node scripts\/release\/check-stage-mfa-http-readonly\.mjs/);
  assert.doesNotMatch(workflow,/SUPABASE_SECRET_KEY|DATABASE_URL|DIRECT_URL|npm run db:migrate|prisma migrate/);
  assert.match(script,/method:"GET",redirect:"manual",cache:"no-store"/);
  assert.doesNotMatch(script,/method:"POST"|method:"PATCH"|method:"DELETE"|method:"PUT"|auth\.admin\.|\.enroll\(|\.unenroll\(|\.challengeAndVerify\(|\.rpc\(/);
  const registered=manifest.controls.find(x=>x.id==="CROSS_ROLE_SUPPORT_HTTP");
  assert.equal(registered?.state,"NOT_VERIFIED");
  for(const id of ["R00-D01","R00-D04","R00-D09"])
    assert.equal(decisions.gates.find(x=>x.id===id)?.status,"PENDING_OWNER_DECISION");
});
