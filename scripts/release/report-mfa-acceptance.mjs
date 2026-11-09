import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

/**
 * Non-authorizing operational readiness report. NEVER turns on an MFA flag,
 * approves an owner gate, calls Supabase, or triggers a Vercel release.
 * Evidence labels are placeholders for independently verified records.
 */
export const REQUIRED_MFA_EVIDENCE=[
  "REAL_STAGING_AAL1_AAL2_TOTP",
  "CROSS_ROLE_SUPPORT_HTTP",
  "PRIVILEGED_API_ROUTE_ACCEPTANCE",
  "RECOVERY_DUAL_OFFICER_EXERCISE",
  "REVOCATION_AND_EXPIRY_PROOF",
  "PRIVATE_LEDGER_AND_AUDIT_REVIEW",
  "DEPLOYMENT_PRODUCTION_SHA"
];
const REQUIRED_OWNER_DECISIONS=["R00-D01","R00-D04","R00-D09"];
const validText=x=>typeof x==="string"&&x.trim().length>=5&&x.length<=500;
const validReviewedAt=x=>typeof x==="string"&&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(x)&&
  Number.isFinite(Date.parse(x));
export function assessMfaOperationalEvidence(ledger,manifest) {
  const blockers=[];
  for(const id of REQUIRED_OWNER_DECISIONS) {
    const record=ledger?.gates?.find(g=>g.id===id);
    if(record?.status!=="APPROVED"||
       !validText(record?.decision_record_ref)||
       !validText(record?.approved_by)||
       !validReviewedAt(record?.approved_at))
      blockers.push("OWNER_DECISION_"+id+"_PENDING_OR_INCOMPLETE");
  }
  if(manifest?.schemaVersion!==1||manifest?.releaseAuthority!=="NEVER_BY_MANIFEST"||
     manifest?.status!=="NOT_ACCEPTED"||!Array.isArray(manifest.controls))
    blockers.push("MANIFEST_STRUCTURE_OR_RELEASE_AUTHORITY_INVALID");
  if(Array.isArray(manifest?.controls)){
    if(manifest.controls.length!==REQUIRED_MFA_EVIDENCE.length||
       new Set(manifest.controls.map(x=>x.id)).size!==REQUIRED_MFA_EVIDENCE.length)
      blockers.push("ACCEPTANCE_CONTROL_INVENTORY_MISMATCH");
    for(const id of REQUIRED_MFA_EVIDENCE){
      const item=manifest.controls.find(c=>c.id===id);
      if(!item||item.state!=="VERIFIED"||
         !validText(item.evidenceReference)||
         !validText(item.independentReviewer)||
         !validReviewedAt(item.reviewedAt))
        blockers.push("ACCEPTANCE_EVIDENCE_"+id+"_NOT_VERIFIED");
    }
  }
  return {
    kind:"READ_ONLY_MFA_RELEASE_EVIDENCE_REPORT",
    status:blockers.length?"BLOCKED":"EVIDENCE_REFERENCES_PRESENT_REQUIRES_INDEPENDENT_REVIEW",
    authorizesEnforcement:false,
    authorizesRecovery:false,
    authorizesProductionDeploy:false,
    blockedRequirements:blockers,
  };
}

function source(relativePath){
  return JSON.parse(readFileSync(new URL(relativePath,import.meta.url),"utf8"));
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  const result=assessMfaOperationalEvidence(
    source("../../docs/implementation/r00-gates.json"),
    source("../../docs/implementation/r01-3d3g-mfa-acceptance-manifest.json")
  );
  // Only control identifiers and readiness counts; never user or factor data.
  process.stdout.write("MFA operational evidence status: "+result.status+"\n");
  process.stdout.write("Missing or unreviewed requirements: "+result.blockedRequirements.length+"\n");
  for(const item of result.blockedRequirements)process.stdout.write(" - "+item+"\n");
  process.stdout.write("This report cannot authorize provider mutations, MFA activation or a deployment.\n");
  if(process.argv.includes("--require-complete")&&result.blockedRequirements.length)
    process.exitCode=1;
}
