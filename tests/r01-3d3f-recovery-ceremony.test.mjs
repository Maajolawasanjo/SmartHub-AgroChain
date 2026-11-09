import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { stripTypeScriptTypes } from "node:module";

const read = p => readFileSync(p,"utf8");
const reviewSource=read("src/server/admin/privileged-recovery-review.ts");
const ceremonySource=read("src/server/admin/privileged-recovery-ceremony.ts");
const ledger=read("docs/implementation/drafts/R01_3D3F_MFA_RECOVERY_LEDGER.sql.disabled");
const ui=read("src/app/admin/security/mfa/recovery/page.tsx");
const mfaPage=read("src/app/admin/security/mfa/page.tsx");
const settings=read("src/app/admin/settings/page.tsx");
const gates=JSON.parse(read("docs/implementation/r00-gates.json")).gates;

const core=stripTypeScriptTypes(
  reviewSource.replace(/^import "server-only";\n/m,"").replace(/^export /gm,""),
  {mode:"strip"}
);
const { evaluateRecoveryReviewPreconditions }=new Function(core+
  "\nreturn {evaluateRecoveryReviewPreconditions};")();
const pure=stripTypeScriptTypes(ceremonySource
  .replace(/^import "server-only";\n/m,"")
  .replace(/^import \{ createHash \} from "node:crypto";\n/m,"")
  .replace(/^import \{[\s\S]*?\} from "\.\/privileged-recovery-review";\n/m,"")
  .replace(/^export /gm,""),{mode:"strip"});
const { recoveryEventDigest, inspectRecoveryCeremony }=new Function(
  "createHash","evaluateRecoveryReviewPreconditions",
  pure+"\nreturn {recoveryEventDigest,inspectRecoveryCeremony};"
)(createHash,evaluateRecoveryReviewPreconditions);

const now=Date.UTC(2026,10,9,11,40);
const initialReview=()=>({
  requestId:"recovery-request-uuid",subjectAccountId:"subject-user",
  requestedById:"subject-user",incidentReference:"INC-SEC-2026-001",
  businessReason:"Authenticator lost, identity checked by independently approved security officers",
  identityReverificationStatus:"VERIFIED",
  issuedAtMs:now-100_000,expiresAtMs:now+600_000,
  currentTimeMs:now,lifecycleStatus:"UNDER_REVIEW",
  approvals:[
    {approverAccountId:"officer-a",designatedRecoveryOfficer:true,
      independentlyAuthenticated:true,decision:"APPROVE",decisionAtMs:now-40_000},
    {approverAccountId:"officer-b",designatedRecoveryOfficer:true,
      independentlyAuthenticated:true,decision:"APPROVE",decisionAtMs:now-30_000},
  ],
});
const makeEvents=(review,version=3)=>{
  const draft=[
    {id:"entry-1",type:"REQUESTED",actorAccountId:review.requestedById,occurredAtMs:review.issuedAtMs},
    {id:"entry-2",type:"IDENTITY_REVERIFIED",actorAccountId:"independent-verifier",occurredAtMs:now-50_000},
    {id:"entry-3",type:"OFFICER_APPROVED",actorAccountId:"officer-a",occurredAtMs:now-40_000},
    {id:"entry-4",type:"OFFICER_APPROVED",actorAccountId:"officer-b",occurredAtMs:now-30_000},
  ];
  let prev="0".repeat(64);
  return draft.map((data,index)=>{
    const event={...data,requestId:review.requestId,subjectAccountId:review.subjectAccountId,
      requestVersion:version,sequence:index+1,previousDigest:prev};
    const digest=recoveryEventDigest(event);prev=digest;return {...event,digest};
  });
};
const makeOfficers=(version=3)=>[
  {accountId:"officer-a",role:"SUPER_ADMIN",status:"ACTIVE",separatelyDesignated:true,
    verifiedProviderIdentityMatchesAccount:true,aal2VerifiedTotp:true,
    providerCheckedAtMs:now-10_000,approvedRequestVersion:version},
  {accountId:"officer-b",role:"SUPER_ADMIN",status:"ACTIVE",separatelyDesignated:true,
    verifiedProviderIdentityMatchesAccount:true,aal2VerifiedTotp:true,
    providerCheckedAtMs:now-10_000,approvedRequestVersion:version}
];
const snapshot=()=>({
 review:initialReview(),expectedRequestVersion:3,lockedRequestVersion:3,
 nonceDigest:"d".repeat(64),consumedNonceDigests:[],
 auditLedgerWritable:true,authProviderVerified:true,
 events:makeEvents(initialReview()),officers:makeOfficers()
});
const checkReason=(caseData,reason)=>{
  const result=inspectRecoveryCeremony(caseData);
  assert.equal(result.reason,reason);
  assert.equal(result.executable,false);
  assert.equal(result.candidateForIndependentReview,false);
};

test("R01.3D.3F independently checks request/version/nonce and chained historical officer evidence",()=>{
  const result=inspectRecoveryCeremony(snapshot());
  assert.deepEqual(result,{
    kind:"NON_EXECUTABLE_RECOVERY_PREFLIGHT",
    candidateForIndependentReview:true,
    executable:false,reason:"TWO_OFFICER_EVIDENCE_OBSERVED"
  });
  assert.match(ceremonySource,/NON-EXECUTABLE recovery-ceremony preflight/);
  assert.doesNotMatch(ceremonySource,/\.unenroll\(|auth\.admin\.|deleteUser\(|updateUser\(|\.rpc\(|\$executeRaw|\.signOut\(/);
});

test("stale or mismatched request versions cannot reuse previous officer decisions",()=>{
  checkReason({...snapshot(),lockedRequestVersion:2},"VERSION_MISMATCH");
  checkReason({...snapshot(),expectedRequestVersion:0},"VERSION_MISMATCH");
  checkReason({...snapshot(),events:makeEvents(initialReview(),2)},"LEDGER_INTEGRITY_FAILED");
  checkReason({...snapshot(),officers:makeOfficers(2)},"MISSING_ACTIVE_OFFICER_PROOF");
});

test("nonce replay, malformed nonce, or provider/audit outage deny the ceremony",()=>{
  checkReason({...snapshot(),nonceDigest:"bad-nonce"},"REPLAY_OR_MISSING_NONCE");
  checkReason({...snapshot(),consumedNonceDigests:["d".repeat(64)]},"REPLAY_OR_MISSING_NONCE");
  checkReason({...snapshot(),auditLedgerWritable:false},"PROVIDER_OR_AUDIT_UNAVAILABLE");
  checkReason({...snapshot(),authProviderVerified:false},"PROVIDER_OR_AUDIT_UNAVAILABLE");
});

test("tampered, duplicated, reordered, contradictory or future ledger events fail closed",()=>{
  const original=snapshot();
  const corrupted=original.events.map((e,i)=>i===2?{...e,actorAccountId:"attacker"}:e);
  checkReason({...original,events:corrupted},"LEDGER_INTEGRITY_FAILED");
  checkReason({...original,events:[original.events[0],original.events[1],original.events[3],original.events[2]]},"LEDGER_INTEGRITY_FAILED");
  checkReason({...original,events:original.events.map((e,i)=>i===1?{...e,id:"entry-1"}:e)},"LEDGER_INTEGRITY_FAILED");
  const reject=original.events.map((e,i)=>i===3?{...e,type:"OFFICER_REJECTED",
    digest:recoveryEventDigest({...e,type:"OFFICER_REJECTED"})}:e);
  checkReason({...original,events:reject},"LEDGER_INTEGRITY_FAILED");
  checkReason({...original,events:[...original.events,original.events[3]]},"LEDGER_INTEGRITY_FAILED");
  checkReason({...original,events:original.events.map((e,i)=>i===3?{...e,occurredAtMs:now+1}:e)},"LEDGER_INTEGRITY_FAILED");
  checkReason({...original,events:original.events.map((e,i)=>i===0?{...e,actorAccountId:"someone-else",
    digest:recoveryEventDigest({...e,actorAccountId:"someone-else"})}:e)},"LEDGER_INTEGRITY_FAILED");
});

test("two real independent active designated officers with fresh AAL2 are essential",()=>{
  const base=snapshot();
  for(const changed of [
    {role:"OPERATIONS"}, {role:"OTHER"}, {status:"SUSPENDED"},
    {status:"DISABLED"}, {separatelyDesignated:false},
    {verifiedProviderIdentityMatchesAccount:false}, {aal2VerifiedTotp:false},
    {providerCheckedAtMs:now+1}, {providerCheckedAtMs:now-6*60_000},
    {approvedRequestVersion:2}, {accountId:"subject-user"},
  ]){
    checkReason({...base,officers:[base.officers[0],{...base.officers[1],...changed}]},"MISSING_ACTIVE_OFFICER_PROOF");
  }
  checkReason({...base,officers:[base.officers[0],base.officers[0]]},"MISSING_ACTIVE_OFFICER_PROOF");
  checkReason({...base,officers:[]},"MISSING_ACTIVE_OFFICER_PROOF");
});

test("rejected, expired, wrong identity or insufficient initial human review never reaches ceremony",()=>{
  const base=snapshot();
  checkReason({...base,review:{...base.review,identityReverificationStatus:"PENDING"}},"HUMAN_REVIEW_INCOMPLETE");
  checkReason({...base,review:{...base.review,lifecycleStatus:"CANCELLED"}},"HUMAN_REVIEW_INCOMPLETE");
  checkReason({...base,review:{...base.review,currentTimeMs:base.review.expiresAtMs}},"HUMAN_REVIEW_INCOMPLETE");
  checkReason({...base,review:{...base.review,approvals:[base.review.approvals[0]]}},"HUMAN_REVIEW_INCOMPLETE");
  checkReason({...base,review:{...base.review,approvals:[base.review.approvals[0],
    {...base.review.approvals[1],decision:"REJECT"}]}},"HUMAN_REVIEW_INCOMPLETE");
});

test("disabled SQL is private, contains no Data API grants or migration and cannot execute from deployed code",()=>{
  assert.match(ledger,/NON-EXECUTABLE/);
  assert.match(ledger,/CREATE SCHEMA IF NOT EXISTS security_private/);
  assert.match(ledger,/REVOKE ALL ON SCHEMA security_private FROM PUBLIC, anon, authenticated/);
  assert.match(ledger,/ENABLE ROW LEVEL SECURITY/);
  assert.match(ledger,/UNIQUE \(request_id,request_version,officer_account_id\)/);
  assert.match(ledger,/UNIQUE \(request_id,sequence\)/);
  assert.match(ledger,/nonce_digest char\(64\) NOT NULL UNIQUE/);
  assert.match(ledger,/DO NOT COPY INTO prisma\/migrations/);
  assert.doesNotMatch(ledger,/GRANT (ALL|INSERT|UPDATE|SELECT|EXECUTE) .* (anon|authenticated)/i);
});

test("admin recovery screen stays read only, owner-gated and connected to existing support escape hatch",()=>{
  assert.match(ui,/requireSuperAdminPage\(\)/);
  assert.match(ui,/privilegedMfaEnforcementEnabled\(\)/);
  assert.match(ui,/operationsMfaEnforcementEnabled\(\)/);
  assert.match(ui,/R00-D01/);
  assert.match(ui,/R00-D04/);
  assert.match(ui,/R00-D09/);
  assert.match(ui,/href="\/support"/);
  assert.doesNotMatch(ui,/fetch\(|method="post"|<form|\.unenroll\(|\.(approve|resetFactor|deleteUser)\(/);
  assert.match(mfaPage,/href="\/admin\/security\/mfa\/recovery"/);
  assert.match(settings,/href="\/admin\/security\/mfa\/recovery"/);
  for(const id of ["R00-D01","R00-D04","R00-D09"])
    assert.equal(gates.find(g=>g.id===id)?.status,"PENDING_OWNER_DECISION");
});
