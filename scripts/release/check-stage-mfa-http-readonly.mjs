import assert from "node:assert/strict";
import {assertReviewedStagingProjectRefs} from "./reviewed-environment-boundary.mjs";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

/**
 * R01.3D.3H — isolated staging *GET-only* HTTP acceptance.
 * No API writes, login attempts, OTP submission, provider mutations, funding,
 * migration, session refresh, Auth admin calls or production networking.
 * All cookies and fixture identifiers must belong to disposable staging.
 *
 * "baseline" checks authorization/tenant isolation with dormant MFA.
 * "enforced" is intentionally unavailable while R00 decisions remain pending.
 * In that mode the staging release must be independently approved and must
 * already enforce both staff MFA policies; this test does NOT enable them.
 */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ref=/^[a-z0-9]{20}$/;
const cookie=(v)=>typeof v==="string"&&v.length>=20 &&
  !/[\r\n]/.test(v) && !/^(undefined|null)$/i.test(v);
const approved=(g)=>g?.status==="APPROVED"&&
  typeof g.decision_record_ref==="string"&&g.decision_record_ref.trim().length>0&&
  typeof g.approved_by==="string"&&g.approved_by.trim().length>0&&
  typeof g.approved_at==="string"&&g.approved_at.trim().length>0;

export function assertMfaHttpStagingTarget(env,governance) {
  assert.equal(env.RELEASE_STAGE_CONFIRM,"I_ACKNOWLEDGE_STAGING_ONLY");
  assert.equal(env.STAGING_MFA_TEST_ISOLATED,"true");
  const stageRef=env.SMART_HUB_STAGE_SUPABASE_REF??"";
  const productionRef=env.SMART_HUB_PRODUCTION_SUPABASE_REF??"";
  assert.match(stageRef,ref,"Reviewed staging project reference is required.");
  assert.match(productionRef,ref,"Reviewed production project reference is required.");
  assertReviewedStagingProjectRefs(stageRef,productionRef);
  const auth=new URL(env.NEXT_PUBLIC_SUPABASE_URL??"http://invalid");
  assert.equal(auth.protocol,"https:");
  assert.equal(auth.hostname,stageRef+".supabase.co");
  assert.equal(auth.pathname,"/");
  assert.ok(!auth.username&&!auth.password&&!auth.search&&!auth.hash);
  const base=new URL(env.STAGING_BASE_URL??"http://invalid");
  const production=new URL(env.PRODUCTION_BASE_URL??"http://invalid");
  assert.equal(base.protocol,"https:");
  assert.equal(production.protocol,"https:");
  assert.ok(!base.username&&!base.password&&!base.search&&!base.hash);
  assert.equal(base.pathname,"/");
  assert.match(base.hostname,/staging|preview|git-/i,
    "HTTP test target must visibly identify staging/preview.");
  assert.equal(env.STAGING_REVIEWED_ORIGIN,base.origin,
    "Staging origin must match separately reviewed release target.");
  assert.notEqual(base.origin,production.origin,
    "Production deployment cannot be used as a staging test target.");
  assert.notEqual(base.hostname,auth.hostname,
    "HTTP test must target the app, not GoTrue directly.");
  assert.equal(env.PAYMENTS_ENABLED,"false");
  assert.equal(env.SUPPLIER_PAYOUTS_ENABLED,"false");
  assert.equal(env.PUBLIC_SIGNUP_ENABLED,"false");
  const mode=env.STAGING_MFA_HTTP_MODE??"baseline";
  assert.ok(mode==="baseline"||mode==="enforced",
    "Only baseline or separately approved enforced MFA acceptance modes are supported.");
  const fixture={
    buyerCase:env.STAGING_BUYER_A_SUPPORT_CASE_ID??"",
    operationsOwnCase:env.STAGING_OPERATIONS_OWN_SUPPORT_CASE_ID??"",
    adminOwnCase:env.STAGING_SUPER_ADMIN_OWN_SUPPORT_CASE_ID??"",
    internalMarker:env.STAGING_SUPPORT_INTERNAL_MARKER??"",
  };
  for(const [name,value] of Object.entries(fixture)) {
    if(name==="internalMarker") {
      assert.match(value,/^[a-zA-Z0-9_-]{18,80}$/,
        "Dedicated staging-only internal note marker must be present.");
    } else assert.match(value,uuid,"Reviewed isolated staging support fixture ID is required.");
  }
  assert.equal(new Set([fixture.buyerCase,fixture.operationsOwnCase,fixture.adminOwnCase]).size,3,
    "Own-case and other-case fixture IDs must be distinct.");
  const sessions={
    BUYER_A:env.STAGING_SESSION_BUYER_A,
    BUYER_B:env.STAGING_SESSION_BUYER_B,
    OPERATIONS:env.STAGING_SESSION_OPERATIONS,
    SUPER_ADMIN:env.STAGING_SESSION_SUPER_ADMIN
  };
  for(const [name,value] of Object.entries(sessions))
    assert.ok(cookie(value),"Dedicated staging HTTP cookie required for "+name);
  assert.equal(new Set(Object.values(sessions)).size,4,
    "Role acceptance sessions must be independently provisioned.");
  if(mode==="enforced"){
    assert.equal(env.STAGING_MFA_HTTP_ENFORCEMENT_APPROVED,"true");
    for(const id of ["R00-D01","R00-D04","R00-D09"])
      assert.ok(approved(governance?.gates?.find(x=>x.id===id)),
        "MFA enforced stage mode is blocked by unapproved owner decision "+id);
    for(const id of ["OPERATIONS_AAL1","OPERATIONS_AAL2","SUPER_ADMIN_AAL1","SUPER_ADMIN_AAL2"]){
      const value=env["STAGING_SESSION_"+id];
      assert.ok(cookie(value),"Two-step staged HTTP cookie missing for "+id);
      sessions[id]=value;
    }
    assert.equal(new Set(Object.values(sessions)).size,8,
      "AAL1/AAL2 test cookies must be distinct from all other staged sessions.");
  }
  return {origin:base.origin,mode,sessions,fixture};
}

export async function requestStagingPage(target,path,cookieHeader,fetcher=fetch) {
  const destination=new URL(path,target.origin);
  assert.equal(destination.origin,target.origin,"Never allow the test to leave reviewed staging origin.");
  assert.equal(destination.protocol,"https:");
  assert.ok(destination.pathname.startsWith("/"));
  const abort=new AbortController();
  const timeout=setTimeout(()=>abort.abort(),12000);
  try{
    const response=await fetcher(destination,{
      method:"GET",redirect:"manual",cache:"no-store",signal:abort.signal,
      headers:{"Cache-Control":"no-store","Accept":"text/html, text/csv",
        ...(cookieHeader?{"Cookie":cookieHeader}:{})}
    });
    return {
      status:response.status,
      location:response.headers?.get("location")??null,
      // Bounded page content needed only for internal-note non-disclosure.
      text:async()=> (await response.text()).slice(0,2_000_000)
    };
  }finally{clearTimeout(timeout);}
}

export async function inspectMfaStageHttp(target,fetcher=fetch) {
  const failures=[];
  let checks=0;
  const expect=async(label,path,session,expected,exposure)=>{
    const result=await requestStagingPage(target,path,session,fetcher);
    checks++;
    if(!expected(result.status,result)) failures.push(label+" returned unexpected status.");
    if(exposure==="MUST_HIDE_INTERNAL"&&result.status===200){
      if((await result.text()).includes(target.fixture.internalMarker))
        failures.push(label+" exposed a private internal support note.");
    }
    if(exposure==="MUST_SHOW_INTERNAL"&&result.status===200){
      if(!(await result.text()).includes(target.fixture.internalMarker))
        failures.push(label+" did not expose the test fixture's own seeded internal note.");
    }
    return result;
  };
  const support=id=>"/support/cases/"+id;
  const s=target.sessions,f=target.fixture;
  await expect("anonymous support",support(f.buyerCase),null,x=>x!==200);
  await expect("owner Buyer A",support(f.buyerCase),s.BUYER_A,x=>x===200,"MUST_HIDE_INTERNAL");
  await expect("other Buyer B",support(f.buyerCase),s.BUYER_B,x=>x===404);
  await expect("buyer cannot see Ops own case",support(f.operationsOwnCase),s.BUYER_A,x=>x===404);
  await expect("buyer cannot see Admin own case",support(f.adminOwnCase),s.BUYER_A,x=>x===404);
  await expect("anonymous Admin CSV","/api/admin/reports/export?days=7",null,x=>x!==200);
  await expect("buyer Admin CSV","/api/admin/reports/export?days=7",s.BUYER_A,x=>x===403);
  await expect("Operations Admin CSV","/api/admin/reports/export?days=7",s.OPERATIONS,x=>x===403);
  await expect("Super Admin Admin CSV","/api/admin/reports/export?days=7",s.SUPER_ADMIN,x=>x===200);
  await expect("buyer Admin portal","/admin",s.BUYER_A,x=>x!==200);
  await expect("buyer Operations portal","/operations",s.BUYER_A,x=>x!==200);
  await expect("Ops Admin portal","/admin",s.OPERATIONS,x=>x!==200);
  await expect("anonymous support home","/support",null,x=>x!==200);
  if(target.mode==="enforced") {
    await expect("Operations AAL1 workspace","/operations",s.OPERATIONS_AAL1,
      (status,r)=>status>=300&&status<400&&
        r.location?.includes("/account/security/operations-mfa"));
    await expect("Operations AAL2 workspace","/operations",s.OPERATIONS_AAL2,
      x=>x===200);
    await expect("Super Admin AAL1 workspace","/admin",s.SUPER_ADMIN_AAL1,
      (status,r)=>status>=300&&status<400&&
        r.location?.includes("/account/security/mfa"));
    await expect("Super Admin AAL2 workspace","/admin",s.SUPER_ADMIN_AAL2,
      x=>x===200);
    await expect("Operations AAL1 own recovery case",support(f.operationsOwnCase),
      s.OPERATIONS_AAL1,x=>x===200,"MUST_HIDE_INTERNAL");
    await expect("Super Admin AAL1 own recovery case",support(f.adminOwnCase),
      s.SUPER_ADMIN_AAL1,x=>x===200,"MUST_HIDE_INTERNAL");
    await expect("Operations AAL1 other customer case",support(f.buyerCase),
      s.OPERATIONS_AAL1,x=>x===404);
    await expect("Super Admin AAL1 other customer case",support(f.buyerCase),
      s.SUPER_ADMIN_AAL1,x=>x===404);
    await expect("Operations AAL2 other customer case",support(f.buyerCase),
      s.OPERATIONS_AAL2,x=>x===200,"MUST_SHOW_INTERNAL");
    await expect("Super Admin AAL2 other customer case",support(f.buyerCase),
      s.SUPER_ADMIN_AAL2,x=>x===200,"MUST_SHOW_INTERNAL");
    await expect("Super Admin AAL1 CSV","/api/admin/reports/export?days=7",
      s.SUPER_ADMIN_AAL1,x=>x===403);
    await expect("Super Admin AAL2 CSV","/api/admin/reports/export?days=7",
      s.SUPER_ADMIN_AAL2,x=>x===200);
  }
  return {status:failures.length?"FAIL":"READ_ONLY_HTTP_CHECKS_PASSED",
    mode:target.mode,checks,failures,
    provesProviderMfa:false,provesRecovery:false,authorizesActivation:false};
}

function loadDecisions(){
  return JSON.parse(readFileSync(new URL("../../docs/implementation/r00-gates.json",import.meta.url),"utf8"));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  try{
    const target=assertMfaHttpStagingTarget(process.env,loadDecisions());
    const result=await inspectMfaStageHttp(target);
    process.stdout.write("Isolated staging HTTP security acceptance: "+result.status+
      " ("+result.checks+" read-only checks, mode="+result.mode+").\n");
    for(const item of result.failures)process.stdout.write("FAIL: "+item+"\n");
    process.stdout.write("No factor, payment or support record was changed. This does not certify MFA provider or recovery.\n");
    if(result.failures.length)process.exitCode=1;
  }catch{
    process.stderr.write("Staging HTTP acceptance blocked: invalid isolated environment, fixture, response, or unavailable network.\n");
    process.exitCode=1;
  }
}
