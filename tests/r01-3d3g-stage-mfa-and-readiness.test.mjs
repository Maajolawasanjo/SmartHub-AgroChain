import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  assessMfaOperationalEvidence,
  REQUIRED_MFA_EVIDENCE
} from "../scripts/release/report-mfa-acceptance.mjs";

const read=p=>readFileSync(p,"utf8");
const decisions=JSON.parse(read("docs/implementation/r00-gates.json"));
const original=JSON.parse(read("docs/implementation/r01-3d3g-mfa-acceptance-manifest.json"));
const reporter=read("scripts/release/report-mfa-acceptance.mjs");
const stage=read("scripts/release/check-stage-mfa-readonly.mjs");
const stageWorkflow=read(".github/workflows/staging-mfa-readonly.yml");
const accountRoute=read("src/app/api/account/security/operations-mfa/[action]/route.ts");
const adminRoute=read("src/app/api/admin/security/mfa/[action]/route.ts");

test("R01.3D.3G current source reports all owner and live staging evidence unavailable",()=>{
  const state=assessMfaOperationalEvidence(decisions,original);
  assert.equal(state.kind,"READ_ONLY_MFA_RELEASE_EVIDENCE_REPORT");
  assert.equal(state.status,"BLOCKED");
  assert.equal(state.authorizesEnforcement,false);
  assert.equal(state.authorizesRecovery,false);
  assert.equal(state.authorizesProductionDeploy,false);
  assert.equal(state.blockedRequirements.length,10);
  for(const gate of ["R00-D01","R00-D04","R00-D09"]){
    assert.equal(decisions.gates.find(x=>x.id===gate)?.status,"PENDING_OWNER_DECISION");
    assert.ok(state.blockedRequirements.includes("OWNER_DECISION_"+gate+"_PENDING_OR_INCOMPLETE"));
  }
  for(const id of REQUIRED_MFA_EVIDENCE){
    assert.ok(state.blockedRequirements.includes("ACCEPTANCE_EVIDENCE_"+id+"_NOT_VERIFIED"));
    const row=original.controls.find(x=>x.id===id);
    assert.equal(row?.state,"NOT_VERIFIED");
    assert.equal(row?.evidenceReference,null);
  }
});

test("even hypothetical complete approval records cannot authorize recovery or enforcement",()=>{
  const approved={gates:decisions.gates.map(g=>
    ["R00-D01","R00-D04","R00-D09"].includes(g.id)
      ?{...g,status:"APPROVED",decision_record_ref:"independent-owner-signed-document",
        approved_by:"authorized-owner",approved_at:"2026-11-09T10:00:00Z"}
      :g)};
  const reviewed={...original,controls:original.controls.map(row=>({
    ...row,state:"VERIFIED",
    evidenceReference:"verified-independent-evidence-ref",
    independentReviewer:"security-officer",
    reviewedAt:"2026-11-09T12:00:00Z"
  }))};
  const result=assessMfaOperationalEvidence(approved,reviewed);
  assert.equal(result.status,"EVIDENCE_REFERENCES_PRESENT_REQUIRES_INDEPENDENT_REVIEW");
  assert.deepEqual(result.blockedRequirements,[]);
  assert.equal(result.authorizesEnforcement,false);
  assert.equal(result.authorizesRecovery,false);
  assert.equal(result.authorizesProductionDeploy,false);
  assert.equal(reviewed.releaseAuthority,"NEVER_BY_MANIFEST");
  assert.equal(reviewed.status,"NOT_ACCEPTED");
});

test("blank or malformed owner records and acceptance evidence cannot become an approval",()=>{
  const fake={gates:decisions.gates.map(g=>
    ["R00-D01","R00-D04","R00-D09"].includes(g.id)?
      {...g,status:"APPROVED",decision_record_ref:"",approved_by:"a",approved_at:"bad"}:g)};
  const falseReport=assessMfaOperationalEvidence(fake,original);
  assert.equal(falseReport.status,"BLOCKED");
  assert.ok(falseReport.blockedRequirements.some(x=>x.startsWith("OWNER_DECISION_")));
  const duplicate={...original,controls:original.controls.map((x,i)=>({
    ...x,id:i===1?original.controls[0].id:x.id
  }))};
  const result=assessMfaOperationalEvidence(decisions,duplicate);
  assert.equal(result.status,"BLOCKED");
  assert.ok(result.blockedRequirements.includes("ACCEPTANCE_CONTROL_INVENTORY_MISMATCH"));
  const spoof={...original,releaseAuthority:"AUTO_ENABLE",status:"ACCEPTED"};
  assert.ok(assessMfaOperationalEvidence(decisions,spoof).blockedRequirements.includes(
    "MANIFEST_STRUCTURE_OR_RELEASE_AUTHORITY_INVALID"));
});

test("stage accepts only reviewed JWT owners, server verified TOTP and TOTP AMR",()=>{
  assert.match(stage,/STAGING_MFA_AAL1_EXPECTED_USER_ID/);
  assert.match(stage,/STAGING_MFA_AAL2_EXPECTED_USER_ID/);
  assert.match(stage,/auth\.getUser\(token\)/);
  assert.match(stage,/auth\.mfa\.getAuthenticatorAssuranceLevel\(token\)/);
  assert.match(stage,/user\.id!==expectedUserId/);
  assert.match(stage,/user\.email_confirmed_at/);
  assert.match(stage,/user\.factors\.some\(f=>f\.factor_type==="totp"&&f\.status==="verified"\)/);
  assert.match(stage,/assurance\.data\.nextLevel!=="aal2"/);
  assert.match(stage,/name==="totp"\|\|name==="mfa\/totp"/);
  assert.match(stageWorkflow,/STAGING_MFA_AAL1_EXPECTED_USER_ID:/);
  assert.match(stageWorkflow,/STAGING_MFA_AAL2_EXPECTED_USER_ID:/);
  assert.match(stageWorkflow,/environment: staging/);
  assert.doesNotMatch(stage,/\.enroll\(|\.unenroll\(|\.challengeAndVerify\(|\.signOut\(|\.updateUser\(|auth\.admin\.|\$executeRaw|\.rpc\(/);
});

test("no experimental recovery code endpoint, factor reset or privilege elevation in this phase",()=>{
  const packageInfo=JSON.parse(read("package.json"));
  assert.equal(packageInfo.dependencies["@supabase/supabase-js"],"2.118.0");
  assert.doesNotMatch(stage,/recoveryCodes\.(generate|regenerate|unenroll|verify)\(/);
  assert.doesNotMatch(accountRoute,/recoveryCodes\.|auth\.admin\.deleteUser/);
  assert.doesNotMatch(adminRoute,/recoveryCodes\.|auth\.admin\.deleteUser/);
  assert.match(read("src/server/admin/privileged-recovery-ceremony.ts"),/executable: false/);
  assert.match(read("docs/implementation/drafts/R01_3D3F_MFA_RECOVERY_LEDGER.sql.disabled"),
    /NON-EXECUTABLE/);
  assert.match(reporter,/authorizesRecovery:false/);
  assert.match(reporter,/authorizesEnforcement:false/);
  assert.match(reporter,/authorizesProductionDeploy:false/);
  assert.doesNotMatch(reporter,/process\.env\.[A-Z_]+\s*=|\.unenroll\(|\.approve\(|auth\.admin/);
});
