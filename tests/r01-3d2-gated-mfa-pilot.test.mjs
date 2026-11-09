import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = name => readFileSync(name, "utf8");
const policyFile = "src/server/admin/privileged-mfa-pilot.ts";
const policySource = read(policyFile);
const handler = read("src/app/api/admin/security/mfa/[action]/route.ts");
const page = read("src/app/admin/security/mfa/page.tsx");
const ui = read("src/features/auth/components/privileged-mfa-pilot.tsx");
const settings = read("src/app/admin/settings/page.tsx");
const gateFile = JSON.parse(read("docs/implementation/r00-gates.json"));
const policy = stripTypeScriptTypes(policySource
  .replace(/^import "server-only";\n/m, "")
  .replace(/^import decisions from "[^"]+";\n/m, "")
  .replace(/^export /gm, ""), { mode: "strip" });
const compile = decisions => new Function("decisions", policy +
  "\nreturn {privilegedMfaPilotEnabled,ownTotpFactor};")(decisions);

test("R01.3D.2 pilot is disabled by default even with an environment flag", () => {
  const pending = compile(gateFile);
  const original = process.env.ADMIN_MFA_PILOT_ENABLED;
  process.env.ADMIN_MFA_PILOT_ENABLED = "true";
  try {
    assert.equal(gateFile.gates.find(x => x.id === "R00-D04").status, "PENDING_OWNER_DECISION");
    assert.equal(pending.privilegedMfaPilotEnabled(), false);
    const approved = compile({ gates: [{
      id: "R00-D04", status: "APPROVED",
      decision_record_ref: "signed-owner-approval",
      approved_by: "authorized-owner",
      approved_at: "2026-11-09T09:00:00Z"
    }] });
    assert.equal(approved.privilegedMfaPilotEnabled(), true);
    for (const missing of [
      { approved_by: null }, { decision_record_ref: "" },
      { approved_at: null }, { status: "PENDING_OWNER_DECISION" }
    ]) {
      const decision = { id: "R00-D04", status: "APPROVED",
        decision_record_ref: "signed-owner-approval",
        approved_by: "authorized-owner", approved_at: "2026-11-09T09:00:00Z",
        ...missing };
      assert.equal(compile({ gates: [decision] }).privilegedMfaPilotEnabled(), false);
    }
    process.env.ADMIN_MFA_PILOT_ENABLED = "false";
    assert.equal(approved.privilegedMfaPilotEnabled(), false);
  } finally {
    if (original === undefined) delete process.env.ADMIN_MFA_PILOT_ENABLED;
    else process.env.ADMIN_MFA_PILOT_ENABLED = original;
  }
});

test("factor ownership checks require exact ID, type and verification state", () => {
  const { ownTotpFactor } = compile(gateFile);
  const all = [
    {id:"own-unverified",factor_type:"totp",status:"unverified"},
    {id:"own-verified",factor_type:"totp",status:"verified"},
    {id:"own-phone",factor_type:"phone",status:"verified"},
  ];
  assert.equal(ownTotpFactor(all,"own-verified","verified"),true);
  assert.equal(ownTotpFactor(all,"own-unverified","unverified"),true);
  assert.equal(ownTotpFactor(all,"own-unverified","verified"),false);
  assert.equal(ownTotpFactor(all,"own-phone","verified"),false);
  assert.equal(ownTotpFactor(all,"another-user-factor","verified"),false);
});

test("MFA mutating actions are origin checked, server role-checked and approval gated", () => {
  assert.match(handler,/assertSameOrigin\(request\)/);
  assert.match(handler,/requireConfig\(\)/);
  assert.match(handler,/getAccountContext\(\)/);
  assert.match(handler,/ctx\.account\.status !== "ACTIVE"/);
  assert.match(handler,/!ctx\.user\.email_confirmed_at/);
  assert.match(handler,/ctx\.account\.role !== "SUPER_ADMIN"/);
  assert.ok(handler.indexOf("if (!privilegedMfaPilotEnabled())") <
    handler.indexOf("const input = await readJson"), "feature gate must be checked before any mutation");
  assert.match(handler,/throw new PublicError\(503, "Authenticator setup is not available/);
  assert.match(handler,/z\.strictObject\(/);
  assert.match(handler,/readJson\(request, 1024\)/);
  assert.match(handler,/regex\(\/\^\\d\{6\}\$\//);
  assert.match(handler,/z\.string\(\)\.uuid\(\)/);
  assert.doesNotMatch(handler,/createSupabaseAdminClient|service_role|auth\.admin|NEXT_PUBLIC_ADMIN_MFA/);
});

test("enrollment requires current password and independent AAL2 for backup factor", () => {
  assert.match(handler,/verifyCurrentPassword\(ctx\.user\.email, currentPassword, ctx\.user\.id\)/);
  assert.match(handler,/mfa\.listFactors\(\)/);
  assert.match(handler,/f\.status === "unverified"/);
  assert.match(handler,/assurance\.data\?\.currentLevel !== "aal2"/);
  assert.match(handler,/mfa\.enroll\(\{ factorType: "totp"/);
  assert.match(handler,/setupSecret: enrolled\.data\.totp\.secret/);
  assert.match(handler,/friendlyName: "SmartHub Authenticator"/);
  assert.match(handler,/reply\(\{[\s\S]*factorId: enrolled\.data\.id/);
});

test("verification uses provider-owned factor list and Auth challenge, never accepts role or factor type from user", () => {
  for (const action of ['"verify-enrollment"','"step-up"','"cancel-pending"'])
    assert.ok(handler.includes(action),action);
  assert.match(handler,/ownTotpFactor\(known\.data\.all, factorId, requiredState\)/);
  assert.match(handler,/mfa\.challengeAndVerify\(\{ factorId, code \}\)/);
  assert.match(handler,/ownTotpFactor\(known\.data\.all, factorId, "unverified"\)/);
  assert.match(handler,/mfa\.unenroll\(\{ factorId \}\)/);
  assert.doesNotMatch(handler,/mfa\.unenroll\(\{ factorId \}\)[\s\S]*auth\.admin\./);
  assert.doesNotMatch(handler,/\.signOut\(\{|\.updateUser\(\{|\.grant\(/);
});

test("pilot page is Super Admin only, disabled before MFA provider calls and secrets are ephemeral", () => {
  assert.match(page,/requireSuperAdminPage\(\)/);
  assert.match(page,/const enabled = privilegedMfaPilotEnabled\(\)/);
  assert.match(page,/const \[readiness, factors\] = enabled/);
  assert.match(page,/getAuthenticatorAssuranceLevel|inspectCurrentPrivilegedMfaReadiness/);
  assert.match(page,/listFactors\(\)/);
  assert.match(page,/!enabled/);
  assert.match(settings,/href="\/admin\/security\/mfa"/);
  assert.match(ui,/"use client"/);
  assert.match(ui,/credentials: "same-origin"/);
  assert.match(ui,/cache: "no-store"/);
  assert.match(ui,/window\.location\.reload\(\)/);
  assert.match(ui,/setPassword\(""""?\)/.source ? /setPassword\(""""?\)/ : /setPassword\(""""?\)/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage|document\.cookie|console\.log|navigator\.sendBeacon/);
});

test("policy has no direct permissions, payment, grant or migration effects", () => {
  for (const name of ["R00-D01","R00-D04","R00-D09"])
    assert.equal(gateFile.gates.find(x=>x.id===name)?.status,"PENDING_OWNER_DECISION");
  assert.doesNotMatch(handler,/\.role\s*=|\.account\.update\(|\.payment\.|\.transfer\(|\.refund\(|\.create\(\{data/);
  assert.doesNotMatch(read("src/server/admin/guard.ts"), /privilegedMfaPilotEnabled|ownTotpFactor/);
  assert.doesNotMatch(read("src/server/auth/context.ts"), /privilegedMfaPilotEnabled|ownTotpFactor/);
  assert.doesNotMatch(read("src/app/api/auth/[action]/route.ts"), /privilegedMfaPilotEnabled|ownTotpFactor/);
});
