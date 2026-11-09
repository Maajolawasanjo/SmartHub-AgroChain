import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";

const read = name => readFileSync(name, "utf8");
const helper = read("src/server/communications/staff-mfa.ts");
const support = read("src/server/communications/support.ts");
const evidence = read("src/server/fulfilment/evidence.ts");
const webhookRoute = read("src/app/api/payments/paystack/webhook/route.ts");
const webhook = read("src/server/payments/webhook.ts");
const accountApi = read("src/app/api/account/[action]/route.ts");
const authApi = read("src/app/api/auth/[action]/route.ts");
const recovery = read("src/server/admin/privileged-recovery-review.ts");
const existingInventory = JSON.parse(read("docs/implementation/r01-3d3c-privileged-route-inventory.json"));
const inventory = JSON.parse(read("docs/implementation/r01-3d3d-crossportal-entrypoints.json"));
const gates = JSON.parse(read("docs/implementation/r00-gates.json"));

class PublicError extends Error {constructor(status, message){super(message);this.status=status;}}
const executable = stripTypeScriptTypes(helper
  .replace(/^import "server-only";\n/m, "")
  .replace(/^import type [^\n]+\n/m, "")
  .replace(/^import \{ PublicError \} from [^\n]+\n/m, "")
  .replace(/^import \{ requireOperationsMfaForActor \} from [^\n]+\n/m, "")
  .replace(/^import \{ requirePrivilegedMfaForSuperAdminActor \} from [^\n]+\n/m, "")
  .replace(/^import [^\n]*operationsMfaEnforcementEnabled[^\n]*\n/gm, "")
  .replace(/^import [^\n]*privilegedMfaEnforcementEnabled[^\n]*\n/gm, "")
  .replace(/^export /gm, ""), {mode:"strip"});
function checkActor(){
  const observed=[];
  const f = new Function("PublicError","requireOperationsMfaForActor",
    "requirePrivilegedMfaForSuperAdminActor",
    executable+"\nreturn requireSupportStaffMfa;");
  const handler=f(PublicError,async ctx=>observed.push("operations:"+ctx.account.id),
    async ctx=>observed.push("admin:"+ctx.account.id));
  return {handler,observed};
}
const actor = role=>({
  account:{id:"current-account",role,status:"ACTIVE"},
  user:{id:"current-account",email_confirmed_at:"2026-11-09"},
  supabase:{auth:{mfa:{}}},
});

test("R01.3D.3D checks staff MFA by current server role and never grants nonstaff permissions",async()=>{
  const {handler,observed}=checkActor();
  await handler(actor("OPERATIONS"));
  await handler(actor("SUPER_ADMIN"));
  assert.deepEqual(observed,["operations:current-account","admin:current-account"]);
  for(const role of ["BUYER","FARMER","FIELD_AGENT"]){
    await assert.rejects(handler(actor(role)),error=>error instanceof PublicError&&error.status===403);
  }
  assert.equal(observed.length,2);
  assert.doesNotMatch(helper,/\$executeRaw|\.role\s*=(?!=)|\.updateUser\(|\.enroll\(|\.unenroll\(|SUPABASE_SECRET_KEY/);
});

test("staff support replies and private notes require gate, but AAL1 owner recovery messages remain possible",()=>{
  const open=support.slice(support.indexOf("export async function openSupportCase"),
    support.indexOf("export async function replySupportCase"));
  assert.match(open,/requireWorkspaceAccount\(\)/);
  assert.doesNotMatch(open,/requireSupportStaffMfa/);
  const reply=support.slice(support.indexOf("export async function replySupportCase"),
    support.indexOf("export async function changeSupportCase"));
  assert.match(reply,/const ctx=await requireWorkspaceAccount\(\)/);
  assert.match(reply,/if\(isStaff\(account\.role\)\)\{/);
  assert.match(reply,/record\?\.openedById!==account\.id/);
  assert.match(reply,/value\.internal \|\| record\?\.openedById!==account\.id/);
  assert.match(reply,/await requireSupportStaffMfa\(ctx\)/);
  assert.ok(reply.indexOf("await requireSupportStaffMfa(ctx)") <
    reply.indexOf("return atomic(db"),"MFA challenge must occur before transaction");
  assert.match(reply,/if\(value\.internal&&!staff\)/);
  assert.match(reply,/if\(staff&&!owner&&actor\.role!=="SUPER_ADMIN"&&row\.assignedToId!==account\.id\)/);
});

test("support staff status transitions are gated while owner case reopen remains AAL1-accessible",()=>{
  const transition=support.slice(support.indexOf("export async function changeSupportCase"),
    support.indexOf("export async function supportCaseList"));
  assert.match(transition,/value\.action!=="reopen" && isStaff\(account\.role\)/);
  assert.match(transition,/await requireSupportStaffMfa\(ctx\)/);
  assert.ok(transition.indexOf("await requireSupportStaffMfa(ctx)") <
    transition.indexOf("return atomic(db"),"MFA must precede workflow mutation");
  assert.match(transition,/if\(!owner\|\|row\.status!=="RESOLVED"\)/);
  assert.match(transition,/if\(!staff\)throw new PublicError\(403,"Only staff may claim cases/);
  assert.match(transition,/if\(actor\.role!=="SUPER_ADMIN"&&assigned!==account\.id\)/);
});

test("shipment evidence staff requests are covered at the server-owned shared actor boundary",()=>{
  const guard=evidence.slice(evidence.indexOf("async function actor()"),evidence.indexOf("async function requireScope("));
  assert.match(guard,/getAccountContext\(\)/);
  assert.match(guard,/ctx\.account\.status!=="ACTIVE"/);
  assert.match(guard,/!ctx\.user\.email_confirmed_at/);
  assert.match(guard,/\["BUYER","OPERATIONS","SUPER_ADMIN"\]/);
  assert.match(guard,/ctx\.account\.role==="OPERATIONS"\)await requireOperationsMfaForActor\(ctx\)/);
  assert.match(guard,/ctx\.account\.role==="SUPER_ADMIN"\)await requirePrivilegedMfaForSuperAdminActor\(ctx\)/);
  assert.ok(guard.indexOf('["BUYER","OPERATIONS","SUPER_ADMIN"]') <
    guard.indexOf("await requireOperationsMfaForActor(ctx)"));
  assert.match(evidence,/async function requireScope\(/);
  assert.match(evidence,/buyerMembership\.findUnique/);
  assert.match(evidence,/order\.quotation\.request\.assignment\?\.assignedToId/);
  assert.doesNotMatch(evidence,/auth\.admin\.deleteUser|\.unenroll\(/);
});

test("signed Paystack webhooks remain independent of a browser MFA session",()=>{
  assert.match(webhookRoute,/receivePaystackWebhook\(Buffer\.concat\(chunks,size\),request\.headers\)/);
  assert.match(webhookRoute,/if\(size>262144\)/);
  assert.match(webhook,/verifyWebhookSignature\(raw,headers\)/);
  assert.match(webhook,/if\(!signatureMode\)throw new PublicError\(401/);
  assert.ok(webhook.indexOf("verifyWebhookSignature(raw,headers)") <
    webhook.indexOf("JSON.parse(raw.toString"),"Authenticate raw provider event before parsing");
  assert.match(webhook,/reconcileSupplierTransfer\(reference,"WEBHOOK"\)/);
  assert.match(webhook,/reconcileReference\(reference,"WEBHOOK"\)/);
  assert.doesNotMatch(webhook,/requireOperationsMfaForActor|requirePrivilegedMfaForSuperAdminActor/);
});

test("password recovery and defensive session revocation must not be blocked by privileged MFA",()=>{
  assert.match(authApi,/case "forgot":/);
  assert.match(authApi,/case "reset-password":/);
  assert.match(authApi,/case "logout":/);
  assert.match(accountApi,/case "revoke-others":/);
  assert.doesNotMatch(authApi,/requireSupportStaffMfa|requireOperationsMfaForActor|requirePrivilegedMfaForSuperAdminActor/);
  assert.match(accountApi,/\["password","email","phone"\]\.includes\(action\)/);
  assert.match(recovery,/NON-EXECUTABLE recovery evidence contract/);
  assert.doesNotMatch(recovery,/mfa\.unenroll\(|auth\.admin\.deleteUser/);
});

function allRouteFiles(dir){
  return readdirSync(dir,{withFileTypes:true}).flatMap(item=>{
    const location=path.join(dir,item.name);
    return item.isDirectory()?allRouteFiles(location):
      item.isFile()&&item.name==="route.ts"?[location.replaceAll("\\","/")]:[];
  });
}

test("every App Router endpoint is inventoried with explicit unaccepted MFA classification",()=>{
  const actual=allRouteFiles("src/app").sort();
  const declared=inventory.entries.map(item=>item.path).sort();
  assert.deepEqual(actual,declared,"New or removed Next.js route requires explicit privileged review");
  assert.equal(inventory.entries.length,new Set(declared).size);
  assert.ok(inventory.entries.length>=90);
  for(const item of inventory.entries){
    assert.equal(item.liveSessionMfaVerified,false);
    assert.equal(item.individualRouteAccepted,false);
    assert.notEqual(item.reviewClass,"UNCLASSIFIED_REVIEW_REQUIRED");
  }
  assert.equal(inventory.ownerSigned,false);
  assert.equal(inventory.allEntryPointsAccepted,false);
  assert.equal(inventory.liveAuthMfaTested,false);
  assert.equal(inventory.recoveryExercised,false);
  for(const group of ["admin","operations","account","auth"]){
    for(const original of existingInventory.groups[group]){
      assert.ok(declared.includes(original.path),original.path);
    }
  }
});

test("provider exceptions, cross-portal staff actions and missing owner gates cannot be mistaken for release authorization",()=>{
  const classes=Object.fromEntries(inventory.entries.map(x=>[x.path,x.reviewClass]));
  assert.equal(classes["src/app/api/payments/paystack/webhook/route.ts"],"PROVIDER_SIGNATURE_NOT_USER_MFA");
  assert.equal(classes["src/app/api/internal/readiness/route.ts"],"BEARER_HEALTH_PROBE_NOT_USER_MFA");
  assert.equal(classes["src/app/api/support/cases/[id]/transition/route.ts"],"SUPPORT_PARTIAL_STAFF_MFA");
  assert.equal(classes["src/app/api/shipments/[id]/evidence/[evidenceId]/route.ts"],"SHIPMENT_STAFF_MFA_SCOPE_SEPARATE");
  assert.equal(classes["src/app/api/auth/accept-invite/route.ts"],"AUTH_SIGNIN_AND_RECOVERY");
  for(const id of ["R00-D01","R00-D04","R00-D09"])
    assert.equal(gates.gates.find(item=>item.id===id)?.status,"PENDING_OWNER_DECISION");
  assert.match(read("src/server/operations/mfa-policy.ts"),/OPERATIONS_MFA_ALL_ENTRYPOINTS_SIGNOFF/);
  assert.match(read("src/server/admin/privileged-mfa-enforcement.ts"),/ADMIN_MFA_ALL_ENTRYPOINTS_SIGNOFF/);
});
