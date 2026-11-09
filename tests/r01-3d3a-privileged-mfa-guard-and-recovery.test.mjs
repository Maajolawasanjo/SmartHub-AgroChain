import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = filename => readFileSync(filename, "utf8");
const enforcementSource = read("src/server/admin/privileged-mfa-enforcement.ts");
const recoverySource = read("src/server/admin/privileged-recovery-review.ts");
const guard = read("src/server/admin/guard.ts");
const stepup = read("src/app/account/security/mfa/page.tsx");
const pilot = read("src/server/admin/privileged-mfa-pilot.ts");
const audit = read("tests/r01-admin-access-foundation.test.mjs");
const gates = JSON.parse(read("docs/implementation/r00-gates.json"));

const strip = source => stripTypeScriptTypes(source
  .replace(/^import "server-only";\n/m, "")
  .replace(/^import type [^\n]+\n/gm, "")
  .replace(/^import decisions from "[^"]+";\n/m, "")
  .replace(/^import \{ privilegedMfaPilotEnabled \} from "[^"]+";\n/m, "")
  .replace(/^export /gm, ""),
  {mode: "strip"});

const enforcement = (decisions, pilotEnabled) =>
  new Function("decisions", "privilegedMfaPilotEnabled", strip(enforcementSource) +
    "\nreturn {privilegedMfaEnforcementEnabled,inspectCurrentPrivilegedMfaAccess};")(
      decisions, () => pilotEnabled
    );

const {evaluateRecoveryReviewPreconditions} = new Function(
  strip(recoverySource) + "\nreturn {evaluateRecoveryReviewPreconditions};"
)();

const originally = () => ({
  pilot: process.env.ADMIN_MFA_ENFORCEMENT_ENABLED,
  recovery: process.env.ADMIN_MFA_RECOVERY_SIGNOFF,
  inventory: process.env.ADMIN_MFA_ALL_ENTRYPOINTS_SIGNOFF,
});

function restore(original){
  const keys = [
    ["ADMIN_MFA_ENFORCEMENT_ENABLED",original.pilot],
    ["ADMIN_MFA_RECOVERY_SIGNOFF",original.recovery],
    ["ADMIN_MFA_ALL_ENTRYPOINTS_SIGNOFF",original.inventory],
  ];
  for(const [key,value] of keys){
    if(value===undefined)delete process.env[key];
    else process.env[key]=value;
  }
}

test("R01.3D.3A cannot activate enforcement with pending owner decisions, even if flags are true", () => {
  const previous=originally();
  try{
    for(const key of [
      "ADMIN_MFA_ENFORCEMENT_ENABLED",
      "ADMIN_MFA_RECOVERY_SIGNOFF",
      "ADMIN_MFA_ALL_ENTRYPOINTS_SIGNOFF",
    ])process.env[key]="true";

    for(const id of ["R00-D01","R00-D04","R00-D09"])
      assert.equal(gates.gates.find(g=>g.id===id)?.status,"PENDING_OWNER_DECISION");

    assert.equal(enforcement(gates,true).privilegedMfaEnforcementEnabled(),false);
    const approved={gates:gates.gates.map(item=>({
      ...item,
      ...( ["R00-D01","R00-D04","R00-D09"].includes(item.id)
        ? {status:"APPROVED",decision_record_ref:"signed-owner-record",
            approved_by:"owner",approved_at:"2026-11-09T10:00:00Z"}
        : {}),
    }))};
    assert.equal(enforcement(approved,true).privilegedMfaEnforcementEnabled(),true);
    assert.equal(enforcement(approved,false).privilegedMfaEnforcementEnabled(),false);
    for(const id of ["R00-D01","R00-D04","R00-D09"]){
      const altered={gates:approved.gates.map(g=>g.id===id?{...g,approved_by:null}:g)};
      assert.equal(enforcement(altered,true).privilegedMfaEnforcementEnabled(),false,id);
    }
    for(const key of [
      "ADMIN_MFA_ENFORCEMENT_ENABLED",
      "ADMIN_MFA_RECOVERY_SIGNOFF",
      "ADMIN_MFA_ALL_ENTRYPOINTS_SIGNOFF",
    ]){
      process.env[key]="false";
      assert.equal(enforcement(approved,true).privilegedMfaEnforcementEnabled(),false,key);
      process.env[key]="true";
    }
  }finally{restore(previous);}
});

const provider=(aal,all,options={})=>({
  getAuthenticatorAssuranceLevel: async()=>{
    if(options.throwAal)throw new Error("provider went away");
    return {data:aal===null?null:{currentLevel:aal},error:options.aalError?new Error("hidden"):null};
  },
  listFactors: async()=>{
    if(options.throwFactors)throw new Error("factor lookup issue");
    return {data:all===null?null:{all},error:options.factorError?new Error("hidden"):null};
  },
});

test("enforcement requires AAL2 plus server-verified TOTP belonging to current session", async()=>{
  const check=enforcement(gates,true).inspectCurrentPrivilegedMfaAccess;
  assert.deepEqual(await check(provider("aal2",[{status:"verified",factor_type:"totp",id:"secret-factor"}])),
    {allowed:true,evidence:"CURRENT_AAL2_AND_VERIFIED_TOTP"});
  assert.deepEqual(await check(provider("aal1",[{status:"verified",factor_type:"totp"}])),
    {allowed:false,reason:"AAL2_REQUIRED"});
  assert.deepEqual(await check(provider("aal2",[{status:"unverified",factor_type:"totp"}])),
    {allowed:false,reason:"NO_VERIFIED_TOTP"});
  assert.deepEqual(await check(provider("aal2",[{status:"verified",factor_type:"phone"}])),
    {allowed:false,reason:"NO_VERIFIED_TOTP"});
  assert.deepEqual(await check(provider("aal2",[])),
    {allowed:false,reason:"NO_VERIFIED_TOTP"});
});

test("missing or failed provider observations deny without exposing factor IDs or errors", async()=>{
  const check=enforcement(gates,true).inspectCurrentPrivilegedMfaAccess;
  const cases=[
    provider(null,[]),provider("aal2",null),provider("aal2",[],{factorError:true}),
    provider("aal2",[],{aalError:true}),provider("aal2",[],{throwAal:true}),
    provider("aal2",[],{throwFactors:true}),
  ];
  for(const mfa of cases){
    const result=await check(mfa);
    assert.equal(result.allowed,false);
    assert.equal(result.reason,"PROVIDER_UNAVAILABLE");
    assert.doesNotMatch(JSON.stringify(result),/factor-id|secret|hidden|provider went away/i);
  }
});

test("primary Super Admin guards add a gated second check after fixed-role authorization",()=>{
  assert.match(guard,/ctx\.account\.role!=="SUPER_ADMIN"\)redirect\("\/forbidden"\)/);
  assert.match(guard,/ctx\.account\.status!==\x22ACTIVE\x22/);
  assert.match(guard,/!ctx\.user\.email_confirmed_at/);
  assert.match(guard,/privilegedMfaEnforcementEnabled\(\)/);
  assert.match(guard,/inspectCurrentPrivilegedMfaAccess\(ctx\.supabase\.auth\.mfa\)/);
  assert.match(guard,/redirect\("\/account\/security\/mfa"\)/);
  assert.match(guard,/throw new PublicError\(403,"An authenticator challenge is required/);
  assert.match(guard,/if \(ctx\.account\.role==="SUPER_ADMIN" && privilegedMfaEnforcementEnabled\(\)\)/);
  assert.ok(guard.indexOf("if(!decision.allowed)") < guard.lastIndexOf("privilegedMfaEnforcementEnabled()"),
    "The fixed permission matrix must remain authoritative");
  assert.doesNotMatch(guard,/user_metadata|\.role\s*=\s*"SUPER_ADMIN"/);
});

test("outside-admin step-up path is reachable with AAL1; does not bypass account authority",()=>{
  assert.match(stepup,/getAccountContext\(\)/);
  assert.match(stepup,/ctx\.account\.status !== "ACTIVE"/);
  assert.match(stepup,/!ctx\.user\.email_confirmed_at/);
  assert.match(stepup,/ctx\.account\.role !== "SUPER_ADMIN"/);
  assert.match(stepup,/privilegedMfaPilotEnabled\(\)/);
  assert.match(stepup,/const \[readiness, factors\] = enabled/);
  assert.match(stepup,/PrivilegedMfaPilotConsole/);
  assert.match(stepup,/Lost your device/);
  assert.ok(!stepup.includes("requireSuperAdminPage"),"Circular guard would cause MFA lockout");
  assert.doesNotMatch(stepup,/auth\.admin|createSupabaseAdminClient|SUPABASE_SECRET_KEY|resetPassword|\.unenroll\(/);
  assert.match(read("src/app/admin/layout.tsx"),/requireSuperAdminPage\(\)/);
  assert.match(pilot,/ADMIN_MFA_PILOT_ENABLED/);
});

const now=Date.UTC(2026,10,9,10);
const review=(patch={})=>({
  requestId:"incident-1", subjectAccountId:"superadmin-1", requestedById:"superadmin-1",
  incidentReference:"INC-REVIEW-2026",businessReason:"Authenticator device replacement after independent identity verification",
  identityReverificationStatus:"VERIFIED",issuedAtMs:now-60000,expiresAtMs:now+60000,
  currentTimeMs:now,lifecycleStatus:"UNDER_REVIEW",
  approvals:[
    {approverAccountId:"security-officer-1",designatedRecoveryOfficer:true,
      independentlyAuthenticated:true,decision:"APPROVE",decisionAtMs:now-30000},
    {approverAccountId:"security-officer-2",designatedRecoveryOfficer:true,
      independentlyAuthenticated:true,decision:"APPROVE",decisionAtMs:now-20000},
  ],...patch
});

test("two independently verified recovery approvers satisfy only human-review preconditions",()=>{
  assert.deepEqual(evaluateRecoveryReviewPreconditions(review()),{
    kind:"HUMAN_REVIEW_PRECONDITIONS_ONLY",
    candidateForApprovedWorkflow:true,
    reason:"TWO_PERSON_PRECONDITIONS_OBSERVED"
  });
  assert.doesNotMatch(recoverySource,/mfa\.unenroll\(|auth\.admin|createSupabaseAdminClient|\.updateUser\(/);
  assert.match(recoverySource,/NON-EXECUTABLE recovery evidence contract/);
});

test("recovery is blocked for self-approval, duplicates, invalid proof, denial and expiry",()=>{
  const base=review();
  const bad=[
    review({approvals:[base.approvals[0],base.approvals[0]]}),
    review({approvals:[base.approvals[0],{...base.approvals[1],approverAccountId:"superadmin-1"}]}),
    review({approvals:[base.approvals[0],{...base.approvals[1],approverAccountId:"superadmin-1"}]}),
    review({approvals:[base.approvals[0],{...base.approvals[1],designatedRecoveryOfficer:false}]}),
    review({approvals:[base.approvals[0],{...base.approvals[1],independentlyAuthenticated:false}]}),
    review({approvals:[base.approvals[0]]}),
    review({identityReverificationStatus:"PENDING"}),
    review({businessReason:"short"}),
    review({currentTimeMs:now+60000}),
    review({lifecycleStatus:"EXECUTED"}),
    review({approvals:[base.approvals[0],{...base.approvals[1],decision:"REJECT"}]}),
  ];
  for(const input of bad){
    const output=evaluateRecoveryReviewPreconditions(input);
    assert.equal(output.candidateForApprovedWorkflow,false,JSON.stringify(input));
  }
  assert.ok(audit.includes("every Admin API route has an explicit documented guard"));
});
