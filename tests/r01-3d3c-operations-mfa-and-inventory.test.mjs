import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";

const read = file => readFileSync(file, "utf8");
const policySource=read("src/server/operations/mfa-policy.ts");
const route=read("src/app/api/account/security/operations-mfa/[action]/route.ts");
const page=read("src/app/account/security/operations-mfa/page.tsx");
const form=read("src/features/auth/components/privileged-mfa-pilot.tsx");
const layout=read("src/app/operations/layout.tsx");
const actor=read("src/server/agriculture/policies.ts");
const admin=read("src/server/admin/guard.ts");
const account=read("src/app/api/account/[action]/route.ts");
const originalAdminPilot=read("src/app/api/admin/security/mfa/[action]/route.ts");
const gates=JSON.parse(read("docs/implementation/r00-gates.json"));
const inventory=JSON.parse(read("docs/implementation/r01-3d3c-privileged-route-inventory.json"));

const transformed=stripTypeScriptTypes(policySource
  .replace(/^import "server-only";\n/m,"")
  .replace(/^import type [^\n]+\n/m,"")
  .replace(/^import \{ PublicError \} from [^\n]+\n/m,"")
  .replace(/^import decisions from [^\n]+\n/m,"")
  .replace(/^import \{[\s\S]*?\} from "@\/server\/admin\/privileged-mfa-enforcement";\n/m,"")
  .replace(/^export /gm,""),{mode:"strip"});

class PublicError extends Error { constructor(status,message){super(message);this.status=status;} }
function load(decisions, privileged=true, result={allowed:true}) {
  let calls=0;
  const f=new Function("decisions","privilegedMfaEnforcementEnabled","inspectCurrentPrivilegedMfaAccess","PublicError",
    transformed+"\nreturn {operationsMfaPilotEnabled,operationsMfaEnforcementEnabled,requireOperationsMfaForActor};");
  const api=f(decisions,()=>privileged,async()=>{calls++;return result;},PublicError);
  return {...api,get calls(){return calls;}};
}
const validActor=()=>({
  account:{id:"operations-1",role:"OPERATIONS",status:"ACTIVE"},
  user:{id:"operations-1",email_confirmed_at:"2026-11-09T10:00:00Z"},
  supabase:{auth:{mfa:{}}},
});
function enableEnvironment(values){
  const keys=["OPERATIONS_MFA_PILOT_ENABLED","OPERATIONS_MFA_ENFORCEMENT_ENABLED",
    "OPERATIONS_MFA_ALL_ENTRYPOINTS_SIGNOFF","OPERATIONS_MFA_RECOVERY_SIGNOFF",
    "OPERATIONS_MFA_ENROLLMENT_VERIFIED"];
  const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  for(const k of keys)process.env[k]=values[k]??"true";
  return ()=>{
    for(const k of keys){if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k];}
  };
}

test("R01.3D.3C Operations MFA never activates on deployment flags alone",async()=>{
  const restore=enableEnvironment({});
  try{
    for(const id of ["R00-D01","R00-D04","R00-D09"])
      assert.equal(gates.gates.find(g=>g.id===id)?.status,"PENDING_OWNER_DECISION");
    const pending=load(gates);
    assert.equal(pending.operationsMfaPilotEnabled(),false);
    assert.equal(pending.operationsMfaEnforcementEnabled(),false);
    await pending.requireOperationsMfaForActor(validActor());
    assert.equal(pending.calls,0,"Pending gate cannot call provider");
    const approved={gates:gates.gates.map(g=>({
      ...g,
      ...( ["R00-D01","R00-D04","R00-D09"].includes(g.id) ? {
        status:"APPROVED",decision_record_ref:"signed-owner-record",approved_by:"owner",
        approved_at:"2026-11-09T09:00:00Z" } : {})
    }))};
    const pilot=load(approved,true);
    assert.equal(pilot.operationsMfaPilotEnabled(),true);
    assert.equal(pilot.operationsMfaEnforcementEnabled(),true);
    assert.equal(load(approved,false).operationsMfaEnforcementEnabled(),false);
    for(const id of ["R00-D01","R00-D04","R00-D09"]){
      const changed={gates:approved.gates.map(g=>g.id===id?{...g,approved_at:null}:g)};
      assert.equal(load(changed,true).operationsMfaEnforcementEnabled(),false);
    }
    for(const name of ["OPERATIONS_MFA_PILOT_ENABLED","OPERATIONS_MFA_ENFORCEMENT_ENABLED",
      "OPERATIONS_MFA_ALL_ENTRYPOINTS_SIGNOFF","OPERATIONS_MFA_RECOVERY_SIGNOFF",
      "OPERATIONS_MFA_ENROLLMENT_VERIFIED"]){
      process.env[name]="false";
      assert.equal(load(approved,true).operationsMfaEnforcementEnabled(),false,name);
      process.env[name]="true";
    }
  }finally{restore();}
});

test("Operations MFA policy enforces current identity and provider, never returns an authorization grant",async()=>{
  const restore=enableEnvironment({});
  const approved={gates:gates.gates.map(g=>["R00-D01","R00-D04","R00-D09"].includes(g.id)
    ?{...g,status:"APPROVED",decision_record_ref:"signed-owner-record",approved_by:"owner",
        approved_at:"2026-11-09T09:00:00Z"}:g)};
  try{
    const checked=load(approved);
    await checked.requireOperationsMfaForActor(validActor());
    assert.equal(checked.calls,1);
    for(const reason of ["AAL2_REQUIRED","NO_VERIFIED_TOTP","PROVIDER_UNAVAILABLE"]){
      const denied=load(approved,true,{allowed:false,reason});
      await assert.rejects(denied.requireOperationsMfaForActor(validActor()),
        error=>error instanceof PublicError && error.status===403);
      assert.equal(denied.calls,1);
    }
    for(const invalid of [
      {...validActor(),account:{id:"operations-1",role:"SUPER_ADMIN",status:"ACTIVE"}},
      {...validActor(),account:{id:"operations-1",role:"OPERATIONS",status:"SUSPENDED"}},
      {...validActor(),user:{id:"someone-else",email_confirmed_at:"2026-11-09"}},
      {...validActor(),user:{id:"operations-1",email_confirmed_at:null}}
    ]){
      const denied=load(approved);
      await assert.rejects(denied.requireOperationsMfaForActor(invalid),e=>e.status===403);
      assert.equal(denied.calls,0);
    }
  }finally{restore();}
});

test("operations API is authenticated AAL1 pilot only: never authorizes SUPER_ADMIN or external factor IDs",()=>{
  assert.match(route,/assertSameOrigin\(request\)/);
  assert.match(route,/requireConfig\(\)/);
  assert.match(route,/getAccountContext\(\)/);
  assert.match(route,/ctx\.account\.status !== "ACTIVE"/);
  assert.match(route,/!ctx\.user\.email_confirmed_at/);
  assert.match(route,/ctx\.account\.role !== "OPERATIONS"/);
  assert.match(route,/if \(!operationsMfaPilotEnabled\(\)\)/);
  assert.match(route,/verifyCurrentPassword\(ctx\.user\.email, currentPassword, ctx\.user\.id\)/);
  assert.match(route,/ownTotpFactor\(known\.data\.all, factorId, requiredState\)/);
  assert.match(route,/mfa\.challengeAndVerify\(\{ factorId, code \}\)/);
  assert.match(route,/mfa\.enroll\(\{ factorType: "totp"/);
  assert.match(route,/mfa\.unenroll\(\{ factorId \}\)/);
  assert.match(route,/ownTotpFactor\(known\.data\.all, factorId, "unverified"\)/);
  assert.match(route,/assurance\.data\?\.currentLevel !== "aal2"/);
  assert.match(route,/readJson\(request, 1024\)/);
  assert.doesNotMatch(route,/SUPABASE_SECRET_KEY|createSupabaseAdminClient|auth\.admin|NEXT_PUBLIC_OPERATIONS_MFA/);
  assert.match(originalAdminPilot,/ctx\.account\.role !== "SUPER_ADMIN"/);
});

test("Operations portal and service/central Admin guards add MFA only after existing role checks",()=>{
  assert.match(layout,/getAccountContext\(\)/);
  assert.match(layout,/ctx\.account\.status !== "ACTIVE"/);
  assert.match(layout,/!ctx\.user\.email_confirmed_at/);
  assert.match(layout,/\["OPERATIONS","SUPER_ADMIN"\]\.includes\(ctx\.account\.role\)/);
  assert.match(layout,/operationsMfaEnforcementEnabled\(\)/);
  assert.match(layout,/redirect\("\/account\/security\/operations-mfa"\)/);
  assert.match(layout,/privilegedMfaEnforcementEnabled\(\)/);
  assert.match(actor,/requireActor\(role: "FARMER" \| "OPERATIONS"\)/);
  assert.match(actor,/hasPermission\(ctx\.account\.role,"operations\.supply\.review"\)/);
  assert.match(actor,/await requireOperationsMfaForActor\(ctx\)/);
  assert.match(actor,/await requirePrivilegedMfaForSuperAdminActor\(ctx\)/);
  assert.ok(actor.indexOf("await requireOperationsMfaForActor(ctx)")>actor.indexOf('hasPermission(ctx.account.role,"operations.supply.review")'));
  assert.match(admin,/evaluateCurrentAdminCapability/);
  assert.match(admin,/ctx\.account\.role==="OPERATIONS"\) await requireOperationsMfaForActor\(ctx\)/);
  assert.match(read("src/server/admin/privileged-mfa-enforcement.ts"),/inspectCurrentPrivilegedMfaAccess/);
});

test("AAL1 Operations step-up remains outside guarded portal and UI has fixed API boundary",()=>{
  assert.match(page,/getAccountContext\(\)/);
  assert.match(page,/ctx\.account\.role !== "OPERATIONS"/);
  assert.match(page,/ctx\.account\.status !== "ACTIVE"/);
  assert.match(page,/!ctx\.user\.email_confirmed_at/);
  assert.match(page,/const \[readiness, factors\] = enabled/);
  assert.match(page,/operationsMfaPilotEnabled\(\)/);
  assert.match(page,/endpointBase="\/api\/account\/security\/operations-mfa"/);
  assert.doesNotMatch(page,/requirePortal\(|requireAdminApi\(|\.unenroll\(/);
  assert.match(form,/endpointBase = "\/api\/admin\/security\/mfa"/);
  assert.match(form,/endpointBase\?: "\/api\/admin\/security\/mfa" \| "\/api\/account\/security\/operations-mfa"/);
  assert.match(form,/fetch\(`\$\{endpointBase\}\/\$\{name\}`/);
  assert.match(read("src/components/dashboard/navigation.ts"),/Authenticator Setup & Step-up/);
});

test("sensitive account credential mutations are guarded but rescue, logout, and session revocation remain available",()=>{
  assert.match(account,/\["password","email","phone"\]\.includes\(action\)/);
  assert.match(account,/ctx\.account\.role==="OPERATIONS"\) await requireOperationsMfaForActor\(ctx\)/);
  assert.match(account,/ctx\.account\.role==="SUPER_ADMIN"\) await requirePrivilegedMfaForSuperAdminActor\(ctx\)/);
  assert.ok(account.indexOf('["password","email","phone"].includes(action)')<account.indexOf('const db=getPrisma()'));
  for(const name of ['case "revoke-others":','case "delete-cancel":','case "delete-request":'])
    assert.ok(account.includes(name),name);
  assert.doesNotMatch(read("src/app/api/auth/[action]/route.ts"),/requireOperationsMfaForActor|requirePrivilegedMfaForSuperAdminActor/);
});

function paths(folder) {
  return readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
    const filename=path.join(folder,entry.name);
    return entry.isDirectory()?paths(filename):
      entry.isFile() && entry.name==="route.ts" ? [filename.replaceAll("\\","/")] : [];
  });
}

test("privileged route inventory is complete as a source inventory, not an activation signoff",()=>{
  for(const [group,folder] of Object.entries({
    admin:"src/app/api/admin",operations:"src/app/api/operations",
    account:"src/app/api/account",auth:"src/app/api/auth",
  })){
    assert.deepEqual(paths(folder).sort(),inventory.groups[group].map(e=>e.path).sort(),
      "New privileged route requires a reviewed inventory entry: "+group);
    for(const entry of inventory.groups[group]){
      assert.ok(["CURRENT_GUARD_NOT_LIVE_MFA_TESTED","DELEGATED_SERVICE_REVIEW_REQUIRED",
        "STEP_UP_EXCEPTION_AAL1","ACCOUNT_RECOVERY_EXCEPTION","SENSITIVE_ACCOUNT_GUARDED"].includes(entry.mfaStatus));
      assert.ok(entry.path.startsWith(folder+"/"));
    }
  }
  assert.equal(inventory.readyForMfaEnforcement,false);
  assert.equal(inventory.ownerAcceptanceSigned,false);
  assert.equal(inventory.liveAuthenticationTested,false);
  assert.equal(inventory.providerRecoveryTested,false);
  assert.equal(gates.gates.find(g=>g.id==="R00-D04")?.status,"PENDING_OWNER_DECISION");
});
