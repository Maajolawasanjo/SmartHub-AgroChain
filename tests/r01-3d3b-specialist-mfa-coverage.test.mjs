import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = path => readFileSync(path, "utf8");
const helper = read("src/server/admin/privileged-actor-mfa.ts");
const settlement = read("src/server/settlements/common.ts");
const payment = read("src/server/payments/common.ts");
const invite = read("src/app/api/admin/staff/invite/route.ts");
const approval = read("src/server/settlements/approval.ts");
const reconciliation = read("src/server/settlements/reconciliation.ts");
const refunds = read("src/server/payments/refunds.ts");
const guard = read("src/server/admin/guard.ts");
const mfaPolicy = read("src/server/admin/privileged-mfa-enforcement.ts");
const gates = JSON.parse(read("docs/implementation/r00-gates.json")).gates;

class PublicError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const runnable = stripTypeScriptTypes(
  helper
    .replace(/^import "server-only";\n/m, "")
    .replace(/^import type \{ getAccountContext \} from "[^"]+";\n/m, "")
    .replace(/^import \{ PublicError \} from "[^"]+";\n/m, "")
    .replace(/^import \{[\s\S]*?\} from "@\/server\/admin\/privileged-mfa-enforcement";\n/m, "")
    .replace(/^export /gm, ""),
  { mode: "strip" }
);
function service(rolloutActive, decision = {allowed: true, evidence: "CURRENT_AAL2_AND_VERIFIED_TOTP"}) {
  let reads = 0;
  const check = new Function(
    "PublicError", "privilegedMfaEnforcementEnabled", "inspectCurrentPrivilegedMfaAccess",
    runnable + "\nreturn requirePrivilegedMfaForSuperAdminActor;"
  )(PublicError, () => rolloutActive, async () => { reads++; return decision; });
  return {check, get reads(){return reads;}};
}
const ctx = (overrides = {}) => ({
  account: {id: "trusted-identity", role: "SUPER_ADMIN", status: "ACTIVE"},
  user: {id: "trusted-identity", email_confirmed_at: "2026-11-09T10:00:00Z"},
  supabase: {auth: {mfa: {}}},
  ...overrides,
});

test("R01.3D.3B protects current behavior while mandatory rollout is unapproved", async () => {
  for (const id of ["R00-D01","R00-D04","R00-D09"])
    assert.equal(gates.find(x=>x.id===id)?.status,"PENDING_OWNER_DECISION");
  const off = service(false, {allowed:false,reason:"PROVIDER_UNAVAILABLE"});
  await off.check(ctx());
  assert.equal(off.reads,0,"No factor provider call before rollout approval");
  assert.match(mfaPolicy,/ADMIN_MFA_ALL_ENTRYPOINTS_SIGNOFF/);
  assert.match(mfaPolicy,/ADMIN_MFA_RECOVERY_SIGNOFF/);
  assert.match(mfaPolicy,/privilegedMfaPilotEnabled\(\)/);
});

test("once enabled, AAL2 evidence is required before specialist actions", async () => {
  const approved=service(true);
  await approved.check(ctx());
  assert.equal(approved.reads,1);
  for (const reason of ["AAL2_REQUIRED","PROVIDER_UNAVAILABLE","NO_VERIFIED_TOTP"]) {
    const denied=service(true,{allowed:false,reason});
    await assert.rejects(denied.check(ctx()),
      error=>error instanceof PublicError && error.status===403);
    assert.equal(denied.reads,1);
  }
});

test("actor mismatch, disabled account, or missing provider email deny before factor reads", async () => {
  for(const candidate of [
    ctx({account:{id:"trusted-identity",role:"OPERATIONS",status:"ACTIVE"}}),
    ctx({account:{id:"trusted-identity",role:"SUPER_ADMIN",status:"SUSPENDED"}}),
    ctx({user:{id:"different-identity",email_confirmed_at:"2026-11-09T10:00:00Z"}}),
    ctx({user:{id:"trusted-identity",email_confirmed_at:null}}),
  ]) {
    const active=service(true);
    await assert.rejects(active.check(candidate),error=>error.status===403);
    assert.equal(active.reads,0);
  }
});

test("specialist settlement service checks MFA after existing Super Admin role gate", () => {
  const fn=settlement.slice(settlement.indexOf("export async function superAdminActor()"),
    settlement.indexOf("export async function lockAccount("));
  assert.match(fn,/requireActor\("OPERATIONS"\)/);
  assert.match(fn,/ctx\.account\.role!=="SUPER_ADMIN"/);
  assert.match(fn,/await requirePrivilegedMfaForSuperAdminActor\(ctx\)/);
  assert.ok(fn.indexOf("role!==\"SUPER_ADMIN\"") <
    fn.indexOf("await requirePrivilegedMfaForSuperAdminActor(ctx)"));
  assert.match(approval,/await superAdminActor\(\)/);
  assert.match(reconciliation,/export async function adminReconcileTransfer[\s\S]*?await superAdminActor\(\)/);
  assert.match(approval,/payable\.agreement\.proposedById===account\.id/);
});

test("payment specialists enforce MFA for Super Admin only, keep Operations reviewer policy", () => {
  const fn=payment.slice(payment.indexOf("export async function financeActor()"),
    payment.indexOf("export async function ensureFinanceScope("));
  assert.match(fn,/requireActor\("OPERATIONS"\)/);
  assert.match(fn,/hasPermission\(ctx\.account\.role,"operations\.requests\.review"\)/);
  assert.match(fn,/if\(ctx\.account\.role==="SUPER_ADMIN"\)await requirePrivilegedMfaForSuperAdminActor\(ctx\)/);
  assert.match(refunds,/await financeActor\(\)/);
  assert.match(refunds,/account\.role!=="SUPER_ADMIN"/);
  assert.match(refunds,/review decision is NOT a Paystack refund/);
  assert.doesNotMatch(payment,/SUPER_ADMIN\s*:\s*\[/);
});

test("staff invitation cannot reserve or dispatch invitation before the MFA check", () => {
  assert.match(invite,/assertSameOrigin\(request\);requireConfig\(\)/);
  assert.match(invite,/ctx\.account\.role!=="SUPER_ADMIN"/);
  assert.match(invite,/ctx\.account\.status!=="ACTIVE"/);
  assert.match(invite,/!ctx\.user\.email_confirmed_at/);
  assert.match(invite,/await requirePrivilegedMfaForSuperAdminActor\(ctx\)/);
  const position=invite.indexOf("await requirePrivilegedMfaForSuperAdminActor(ctx)");
  for(const forbidden of ["tx.staffInvitation.create","inviteUserByEmail","db.account.findUnique"]) {
    const target = invite.indexOf(forbidden);
    assert.ok(target >= 0 && position < target, "MFA must precede "+forbidden);
  }
  assert.match(invite,/verifyCurrentPassword\(ctx\.user\.email,currentPassword,ctx\.user\.id\)/);
  assert.match(invite,/z\.enum\(STAFF_ROLES\)/);
});

test("no role expansion, database migration, unapproved recovery, or current guard bypass", () => {
  assert.match(guard,/evaluateCurrentAdminCapability/);
  assert.match(guard,/inspectCurrentPrivilegedMfaAccess\(ctx\.supabase\.auth\.mfa\)/);
  assert.doesNotMatch(helper,/auth\.admin|\.unenroll\(|\.enroll\(|\.transfer\(|\.refund\(|\$executeRaw|\.role\s*=/);
  assert.doesNotMatch(settlement,/\.enroll\(|\.unenroll\(/);
  assert.doesNotMatch(payment,/\.enroll\(|\.unenroll\(/);
  assert.match(read("src/server/admin/permissions.ts"),/STAFF_ROLES = \["FIELD_AGENT", "OPERATIONS"\]/);
  assert.match(read("src/app/admin/layout.tsx"),/requireSuperAdminPage\(\)/);
});
