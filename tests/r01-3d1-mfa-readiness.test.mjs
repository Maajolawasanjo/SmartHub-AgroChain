import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = path => readFileSync(path, "utf8");
const helperPath = "src/server/admin/privileged-mfa-readiness.ts";
const helperSource = read(helperPath);
const settingsSource = read("src/app/admin/settings/page.tsx");
const adminGuard = read("src/server/admin/guard.ts");
const adminLayout = read("src/app/admin/layout.tsx");
const gates = JSON.parse(read("docs/implementation/r00-gates.json")).gates;
const code = stripTypeScriptTypes(
  helperSource
    .replace(/^import "server-only";\n/, "")
    .replace(/^import type [^\n]+\n/m, "")
    .replace(/^export /gm, ""),
  {mode: "strip"}
);
const {inspectCurrentPrivilegedMfaReadiness} =
  new Function(code + "\nreturn {inspectCurrentPrivilegedMfaReadiness};")();

function mfa(currentLevel, nextLevel, factors, error = null) {
  return {
    getAuthenticatorAssuranceLevel: async () => ({
      data: {currentLevel, nextLevel}, error: null
    }),
    listFactors: async () => ({
      data: factors === null ? null : {all: factors}, error
    }),
  };
}

test("R01.3D.1 observes AAL2 only alongside at least one provider-verified factor", async () => {
  const data = await inspectCurrentPrivilegedMfaReadiness(
    mfa("aal2", "aal2", [
      {id: "secret-factor-id", phone: "+2340000000000", status: "verified", totp: {secret: "hidden"}},
      {id: "other-factor-id", status: "unverified"},
    ])
  );
  assert.deepEqual(data, {
    kind: "READ_ONLY_SESSION_OBSERVATION",
    currentLevel: "aal2",
    nextLevel: "aal2",
    verifiedFactorCount: 1,
    assessment: "SECOND_FACTOR_OBSERVED",
    privilegedMfaPolicyEnforced: false
  });
  const text = JSON.stringify(data);
  assert.doesNotMatch(text, /secret-factor-id|other-factor-id|hidden|2340000000000|phone|qr_code/i);
});

test("a verified factor without AAL2 is not a privileged MFA authentication", async () => {
  const data = await inspectCurrentPrivilegedMfaReadiness(
    mfa("aal1", "aal2", [{status: "verified"}])
  );
  assert.equal(data.assessment, "SECOND_FACTOR_NOT_OBSERVED");
  assert.equal(data.currentLevel, "aal1");
  assert.equal(data.nextLevel, "aal2");
  assert.equal(data.verifiedFactorCount, 1);
  assert.equal(data.privilegedMfaPolicyEnforced, false);
});

test("AAL2 without verified factor evidence cannot be displayed as completed", async () => {
  const data = await inspectCurrentPrivilegedMfaReadiness(mfa("aal2", "aal2", []));
  assert.equal(data.assessment, "SECOND_FACTOR_NOT_OBSERVED");
  assert.equal(data.verifiedFactorCount, 0);
});

test("failed or missing provider checks report unknown, never readiness", async () => {
  const unavailableFactors = await inspectCurrentPrivilegedMfaReadiness(mfa("aal2", "aal2", null));
  assert.equal(unavailableFactors.assessment, "UNKNOWN");
  assert.equal(unavailableFactors.verifiedFactorCount, null);
  const erroredFactors = await inspectCurrentPrivilegedMfaReadiness(
    mfa("aal2", "aal2", [{status:"verified"}], new Error("provider unavailable"))
  );
  assert.equal(erroredFactors.assessment,"UNKNOWN");
  const unknownAssurance = await inspectCurrentPrivilegedMfaReadiness(mfa(null, null, [{status:"verified"}]));
  assert.equal(unknownAssurance.assessment, "UNKNOWN");
  const rejectedCalls = await inspectCurrentPrivilegedMfaReadiness({
    getAuthenticatorAssuranceLevel: async () => {throw new Error("sensitive provider detail");},
    listFactors: async () => {throw new Error("provider down");}
  });
  assert.deepEqual(rejectedCalls, {
    kind: "READ_ONLY_SESSION_OBSERVATION",
    currentLevel: "unknown",
    nextLevel: "unknown",
    verifiedFactorCount: null,
    assessment: "UNKNOWN",
    privilegedMfaPolicyEnforced: false,
  });
  assert.doesNotMatch(JSON.stringify(rejectedCalls), /sensitive provider detail|provider down/);
});

test("R01.3D.1 read-only Admin settings are protected, honest, and do not alter existing guards", () => {
  assert.match(settingsSource, /requireSuperAdminPage\(\)/);
  assert.match(adminLayout, /requireSuperAdminPage\(\)/);
  assert.match(settingsSource, /inspectCurrentPrivilegedMfaReadiness\(ctx\.supabase\.auth\.mfa\)/);
  assert.match(settingsSource, /getPrisma\(\)\.account\.count\(\{where:\{role:"SUPER_ADMIN",status:"ACTIVE"\}\}\)/);
  assert.match(settingsSource, /R00-D04 pending owner decision/);
  assert.match(settingsSource, /does not verify the required two designated Super Admin responsibilities/);
  assert.match(settingsSource, /Privileged MFA enforcement policy/);
  assert.match(adminGuard, /evaluateCurrentAdminCapability/);
  assert.doesNotMatch(adminGuard, /inspectCurrentPrivilegedMfaReadiness/);
  assert.doesNotMatch(helperSource, /\.enroll\(|\.challenge\(|\.verify\(|\.unenroll\(|\.updateUser\(|\.signOut\(|getPrisma\(|\.create\(|\.update\(/);
  assert.doesNotMatch(settingsSource, /\.enroll\(|\.challenge\(|\.verify\(|\.unenroll\(/);
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /enum AccountRole \{\s*BUYER\s*FARMER\s*FIELD_AGENT\s*OPERATIONS\s*SUPER_ADMIN\s*\}/);
  for (const id of ["R00-D01", "R00-D04", "R00-D09"])
    assert.equal(gates.find(item => item.id === id)?.status, "PENDING_OWNER_DECISION");
});
