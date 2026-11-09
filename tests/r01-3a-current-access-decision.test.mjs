import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = (path) => readFileSync(path, "utf8");
const permissionsSource = read("src/server/admin/permissions.ts");
const decisionSource = read("src/server/admin/current-access-decision.ts");
const guardSource = read("src/server/admin/guard.ts");

/**
 * Execute the actual TypeScript bodies without a database, network or new
 * dependencies. Node 22.16.0 supports type stripping; module imports are
 * removed only in this isolated unit-test harness.
 */
const policyCode = permissionsSource
  .replace(/^import type [^\n]+\n/m, "")
  .replace(/^export /gm, "");
const decisionCode = decisionSource
  .replace(/^import "server-only";\n/m, "")
  .replace(/^import type [^\n]+\n/m, "")
  .replace(/import \{[\s\S]*?\} from "@\/server\/admin\/permissions";\n/m, "")
  .replace(/^export /gm, "");
const executable = stripTypeScriptTypes(policyCode + "\n" + decisionCode, { mode: "strip" });
const { evaluateCurrentAdminCapability, hasPermission, isAdministrativePermission, PERMISSIONS } =
  new Function(executable + "\nreturn { evaluateCurrentAdminCapability, hasPermission, isAdministrativePermission, PERMISSIONS };")();

const decide = (role, permission, status = "ACTIVE", emailConfirmed = true) =>
  evaluateCurrentAdminCapability({ role, permission, status, emailConfirmed });

test("R01.3A preserves all existing valid Admin API grants exactly", () => {
  const roles = ["BUYER", "FARMER", "FIELD_AGENT", "OPERATIONS", "SUPER_ADMIN"];
  for (const role of roles) {
    for (const permission of PERMISSIONS) {
      const previousAllowed =
        ["OPERATIONS", "SUPER_ADMIN"].includes(role) &&
        isAdministrativePermission(permission) &&
        hasPermission(role, permission);
      const actual = decide(role, permission);
      assert.equal(actual.allowed, previousAllowed, role + " / " + permission);
    }
  }
});

test("R01.3A denies inactive, unverified, non-Admin, undeclared and ungranted capabilities", () => {
  assert.deepEqual(decide("SUPER_ADMIN", "staff.manage", "SUSPENDED"), {
    allowed: false, reason: "ACCOUNT_INACTIVE"
  });
  assert.deepEqual(decide("SUPER_ADMIN", "staff.manage", "ACTIVE", false), {
    allowed: false, reason: "EMAIL_UNVERIFIED"
  });
  assert.deepEqual(decide("FIELD_AGENT", "staff.manage"), {
    allowed: false, reason: "NON_ADMIN_ROLE"
  });
  assert.deepEqual(decide("OPERATIONS", "platform.finance.approve"), {
    allowed: false, reason: "CAPABILITY_NOT_DECLARED"
  });
  assert.deepEqual(decide("OPERATIONS", "staff.invite"), {
    allowed: false, reason: "CAPABILITY_NOT_GRANTED"
  });
  assert.deepEqual(decide("SUPER_ADMIN", "buyer.request.create"), {
    allowed: false, reason: "CAPABILITY_NOT_DECLARED"
  });
  assert.deepEqual(decide("SUPER_ADMIN", "staff.manage"), {
    allowed: true, source: "CURRENT_FIXED_ROLE_MATRIX"
  });
});

test("R01.3A actually runs in the Admin API guard without replacing the old safety gate", () => {
  assert.match(guardSource, /evaluateCurrentAdminCapability\(\{/);
  assert.match(guardSource, /if\(!decision\.allowed\)throw new PublicError\(403/);
  assert.match(guardSource, /ctx\.account\.status!=="ACTIVE"/);
  assert.match(guardSource, /!ctx\.user\.email_confirmed_at/);
  assert.match(guardSource, /!hasPermission\(ctx\.account\.role,permission\)/);
  assert.match(guardSource, /!isAdministrativePermission\(permission\)/);
  assert.doesNotMatch(decisionSource, /target-access-blueprint|TARGET_ADMIN|\.create\(|\.update\(|getPrisma\(|supabase\.auth/);
});

test("R01.3A does not activate proposed roles or overwrite unresolved decisions", () => {
  const schema = read("prisma/schema.prisma");
  const block = schema.match(/enum AccountRole \{([^}]+)\}/);
  assert.ok(block);
  assert.deepEqual(block[1].trim().split(/\s+/), ["BUYER", "FARMER", "FIELD_AGENT", "OPERATIONS", "SUPER_ADMIN"]);
  const gates = JSON.parse(read("docs/implementation/r00-gates.json")).gates;
  for (const id of ["R00-D01", "R00-D04", "R00-D09"]) {
    assert.equal(gates.find((gate) => gate.id === id)?.status, "PENDING_OWNER_DECISION");
  }
  const design = read("docs/implementation/R01_3A_CAPABILITY_AND_SCHEMA_DESIGN.md");
  for (const phrase of ["no migration", "R00-D01", "R00-D04", "R00-D09", "SOURCE-IMPLEMENTED", "DESIGN ONLY"]) {
    assert.ok(design.toLowerCase().includes(phrase.toLowerCase()), phrase);
  }
});
