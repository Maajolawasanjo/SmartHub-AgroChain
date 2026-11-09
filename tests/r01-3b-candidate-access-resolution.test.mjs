import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";

const read = (file) => readFileSync(file, "utf8");
const sourcePath = "src/server/admin/candidate-access-resolution.ts";
const source = read(sourcePath);
const runnable = stripTypeScriptTypes(source
  .replace(/^import "server-only";\n/, "")
  .replace(/^export /gm, ""), { mode: "strip" });
const {
  CANDIDATE_MODULES,
  CANDIDATE_ACTIONS,
  candidateScopeMatches,
  simulateCandidateAccess
} = new Function(runnable + "\nreturn {CANDIDATE_MODULES,CANDIDATE_ACTIONS,candidateScopeMatches,simulateCandidateAccess};")();

const actor = Object.freeze({
  id: "staff-1", authenticated: true, providerEmailVerified: true,
  accountStatus: "ACTIVE", staffDirectoryLinked: true, engagementEligible: true
});
const time = Date.UTC(2026, 10, 9);
const baseRecord = { id: "record-1", stateCode: "LA", lgaCode: "IKEJA",
  ownerId: "staff-1", departmentId: "sourcing", assignedPrincipalIds: ["staff-1"],
  areaId: "lagos-main", projectId: "proc-4", relationshipId: "supplier-12"
};
const entitlement = (overrides = {}) => ({
  principalId: actor.id, sourceId: "role-assignment-7",
  sourceKind: "ROLE_TEMPLATE", capability: "sourcing-quotes:view",
  approvalReference: "approved-role-record-7",
  approvedById: "approver-2", status: "ACTIVE",
  effectiveFromMs: time - 1000, expiresAtMs: null,
  scope: { kind: "STATE", stateCode: "LA" }, roleVersion: 3, ...overrides
});
const request = (overrides = {}) => ({
  identity: actor, capability: "sourcing-quotes:view", record: baseRecord,
  evidence: [entitlement()], atMs: time, separationOfDutiesReviewed: true,
  unresolvedConflict: false, ...overrides
});
const decision = (overrides) => simulateCandidateAccess(request(overrides));
const assertDenied = (result, reason) => {
  assert.equal(result.allowed, false);
  assert.equal(result.kind, "OFFLINE_SIMULATION_ONLY");
  assert.equal(result.reason, reason);
};

test("candidate vocabulary is exactly 12 module groups and seven approved action verbs", () => {
  assert.equal(CANDIDATE_MODULES.length, 12);
  assert.deepEqual([...CANDIDATE_ACTIONS],
    ["view", "create", "edit", "approve", "delete", "export", "manage"]);
  assert.equal(new Set(CANDIDATE_MODULES).size, 12);
});

test("explicit scoped role permission is allowed only in offline simulation", () => {
  assert.deepEqual(decision(), {
    allowed: true, kind: "OFFLINE_SIMULATION_ONLY", sourceIds: ["role-assignment-7"]
  });
  assertDenied(decision({record: { ...baseRecord, stateCode: "OY" }}), "NO_VALID_SCOPED_PERMISSION");
  assertDenied(decision({record: { ...baseRecord, id: "" }}), "INVALID_RESOURCE_OR_CLOCK");
});

test("unknown capabilities, finance, approval and access governance remain blocked", () => {
  for (const capability of ["sourcing-quotes:fly", "sourcing-quotes:view:extra",
    "other:view", "operations.requests.review", "finance:edit", "finance:view",
    "sourcing-quotes:approve", "team-access:view", "system-settings:manage"]) {
    const expected = ["finance:", "sourcing-quotes:approve", "team-access:",
      "system-settings:"].some(prefix => capability.startsWith(prefix))
      ? "PRIVILEGED_POLICY_NOT_APPROVED" : "UNKNOWN_CAPABILITY";
    assertDenied(decision({capability}), expected);
  }
});

test("invalid identity and account engagement cannot use existing grants", () => {
  const invalid = [
    {authenticated:false}, {providerEmailVerified:false},
    {accountStatus:"SUSPENDED"}, {accountStatus:"DISABLED"},
    {staffDirectoryLinked:false}, {engagementEligible:false}, {id:""}
  ];
  for (const patch of invalid) {
    assertDenied(decision({identity: {...actor,...patch}}), "ACTOR_NOT_ELIGIBLE");
  }
});

test("independent restrictions win within scope, but not outside scope", () => {
  const restriction = entitlement({
    sourceKind:"INDIVIDUAL_RESTRICTION", sourceId:"restriction-8",
    scope: {kind:"STATE", stateCode:"LA"}
  });
  assertDenied(decision({evidence: [entitlement(), restriction]}), "INDIVIDUAL_RESTRICTION");
  assert.deepEqual(decision({evidence: [entitlement(), {
    ...restriction, scope:{kind:"STATE",stateCode:"OG"}
  }]}), {allowed:true,kind:"OFFLINE_SIMULATION_ONLY",sourceIds:["role-assignment-7"]});
});

test("expired, future, revoked, self-approved and unversioned evidence never grants", () => {
  const invalid = [
    {status:"REVOKED"}, {status:"PENDING"}, {status:"SUSPENDED"},
    {effectiveFromMs:time+1}, {expiresAtMs:time},
    {expiresAtMs:time-2000}, {expiresAtMs:Number.NaN},
    {approvalReference:""}, {approvedById:"staff-1"},
    {roleVersion:undefined}, {roleVersion:0}, {principalId:"someone-else"},
    {sourceId:""}, {capability:"orders-fulfilment:view"}
  ];
  for (const patch of invalid)
    assertDenied(decision({evidence:[entitlement(patch)]}), "NO_VALID_SCOPED_PERMISSION");
});

test("separation review is mandatory and unresolved conflicts deny", () => {
  assertDenied(decision({separationOfDutiesReviewed:false}), "SEPARATION_REVIEW_MISSING");
  assertDenied(decision({unresolvedConflict:true}), "UNRESOLVED_CONFLICT");
});

test("valid independent grant remains after template removal and records both sources", () => {
  const individual = entitlement({sourceKind:"INDIVIDUAL_GRANT",sourceId:"approved-exception-6",
    scope:{kind:"OWN_RECORD"},roleVersion:undefined});
  assert.deepEqual(decision({evidence:[entitlement(), individual]}),
    {allowed:true,kind:"OFFLINE_SIMULATION_ONLY",
      sourceIds:["role-assignment-7","approved-exception-6"]});
  assert.deepEqual(decision({evidence:[entitlement({status:"REVOKED"}),individual]}),
    {allowed:true,kind:"OFFLINE_SIMULATION_ONLY",sourceIds:["approved-exception-6"]});
  assertDenied(decision({evidence:[entitlement({status:"REVOKED"}), individual],
    record:{...baseRecord,ownerId:"someone-else",stateCode:"OY"}}), "NO_VALID_SCOPED_PERMISSION");
});

test("all supported scope kinds use the actual record, not role title", () => {
  const examples = [
    [{kind:"COMPANY"},true],
    [{kind:"OWN_RECORD"},true],
    [{kind:"ASSIGNED_RECORD"},true],
    [{kind:"DEPARTMENT",departmentId:"sourcing"},true],
    [{kind:"STATE",stateCode:"LA"},true],
    [{kind:"LOCAL_GOVERNMENT",stateCode:"LA",lgaCode:"IKEJA"},true],
    [{kind:"LOCAL_GOVERNMENT",stateCode:"OY",lgaCode:"IKEJA"},false],
    [{kind:"OPERATIONAL_AREA",areaId:"lagos-main"},true],
    [{kind:"PROJECT",projectId:"proc-4"},true],
    [{kind:"BUSINESS_RELATIONSHIP",relationshipId:"supplier-12"},true],
    [{kind:"PROJECT",projectId:""},false],
    [{kind:"PROJECT",projectId:"wrong"},false],
    [{kind:"UNKNOWN"},false]
  ];
  for (const [scope, expected] of examples)
    assert.equal(candidateScopeMatches(scope, baseRecord, actor.id),expected,JSON.stringify(scope));
  assert.equal(candidateScopeMatches({kind:"ASSIGNED_RECORD"},
    {...baseRecord, assignedPrincipalIds:[]}, actor.id), false);
});

function walk(folder){
  return readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
    const item=path.join(folder,entry.name);
    return entry.isDirectory()?walk(item):
      entry.isFile()&&/\.(ts|tsx)$/.test(entry.name)?[item]:[];
  });
}

test("candidate evaluator is deliberately NOT imported into any live backend or page", () => {
  const imports=walk("src").filter(file=>file.replaceAll("\\","/")!==sourcePath &&
    read(file).includes("candidate-access-resolution"));
  assert.deepEqual(imports, [], "candidate policy must not be wired to request authorization");
  assert.match(source, /OFFLINE CONTRACT — NOT A PRODUCTION AUTHORIZATION ENGINE/);
  assert.doesNotMatch(source, /getPrisma\(|supabase\.auth|hasPermission\(|fetch\(|\.create\(|\.update\(/);
  const oldGuard=read("src/server/admin/guard.ts");
  assert.match(oldGuard,/evaluateCurrentAdminCapability\(\{/);
  assert.doesNotMatch(oldGuard,/simulateCandidateAccess/);
  const schema=read("prisma/schema.prisma");
  assert.doesNotMatch(schema,/model AdminRoleTemplate\s*\{/);
  const gates=JSON.parse(read("docs/implementation/r00-gates.json")).gates;
  for (const id of ["R00-D01","R00-D04","R00-D09"])
    assert.equal(gates.find(g=>g.id===id).status,"PENDING_OWNER_DECISION");
});
