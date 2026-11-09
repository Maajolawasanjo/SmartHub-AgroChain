import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const read = p => readFileSync(p, "utf8");
const modulePath = "src/server/admin/proposed-permission-hydration.ts";
const source = read(modulePath);
const sqlPath = "docs/implementation/drafts/R01_3C2_PERMISSION_STORE.sql.disabled";
const sql = read(sqlPath);
const js = stripTypeScriptTypes(source
  .replace(/^import "server-only";\n/, "")
  .replace(/^export /gm, ""), { mode: "strip" });
const {hydrateProposedPermissionRows, PROPOSED_ACCESS_STORAGE_STATE} =
  new Function(js + "\nreturn { hydrateProposedPermissionRows, PROPOSED_ACCESS_STORAGE_STATE };")();
const now = Date.UTC(2026, 10, 9);
const permission = (overrides = {}) => ({
  principalId: "staff-1",
  sourceId: "role-assignment-7",
  sourceKind: "ROLE_TEMPLATE",
  capability: "sourcing-quotes:view",
  approvalReference: "ROLE-APPROVAL-171",
  businessReason: "Access needed to coordinate an assigned procurement request",
  requestedById: "staff-1", // requesting your own access is not approving it
  approvedById: "independent-approver-2",
  status: "ACTIVE",
  provisioningStatus: "PROVISIONED",
  effectiveFromMs: now - 1000,
  expiresAtMs: now + 60000,
  scope: {kind: "STATE", stateCode: "LA"},
  roleVersion: 3,
  ...overrides
});
const hydrate = (rows = [permission()], overrides = {}) =>
  hydrateProposedPermissionRows({principalId: "staff-1", atMs:now, rows, ...overrides});
const denied = (result, reason) => {
  assert.deepEqual(result, {ok:false,kind:"DORMANT_PERSISTENCE_PROPOSAL",reason});
};

test("R01.3C.2 hydrate approved, provisioned, scoped, versioned evidence only as DORMANT data", () => {
  assert.equal(PROPOSED_ACCESS_STORAGE_STATE,"NOT_MIGRATED_NOT_ACTIVE");
  assert.deepEqual(hydrate(),{
    ok:true,kind:"DORMANT_PERSISTENCE_PROPOSAL",
    evidence:[{
      principalId:"staff-1",sourceId:"role-assignment-7",
      sourceKind:"ROLE_TEMPLATE",capability:"sourcing-quotes:view",
      approvalReference:"ROLE-APPROVAL-171",approvedById:"independent-approver-2",
      status:"ACTIVE",effectiveFromMs:now-1000,expiresAtMs:now+60000,
      scope:{kind:"STATE",stateCode:"LA"},roleVersion:3
    }]
  });
});

test("requests initiated by the staff member are allowed ONLY when independently approved", () => {
  assert.equal(hydrate().ok, true, "self-request is not the same as self-approval");
  denied(hydrate([permission({approvedById:"staff-1"})]),"MALFORMED_ROW");
  denied(hydrate([permission({requestedById:"independent-approver-2"})]),"MALFORMED_ROW");
  denied(hydrate([permission({approvalReference:""})]),"MALFORMED_ROW");
  denied(hydrate([permission({approvedById:""})]),"MALFORMED_ROW");
  denied(hydrate([permission({businessReason:"too short"})]),"MALFORMED_ROW");
});

test("active exceptions and role versions do not imply finance or privileged approval authority", () => {
  for (const capability of ["finance:view","finance:manage","team-access:create",
    "system-settings:edit","sourcing-quotes:approve","reports-audit:approve"]) {
    denied(hydrate([permission({capability})]),"UNAPPROVED_PRIVILEGED_CAPABILITY");
  }
  for (const capability of ["foo:view","sourcing-quotes:fly","sourcing-quotes:view:extra"]) {
    denied(hydrate([permission({capability})]),"MALFORMED_ROW");
  }
});

test("inactive, revoked, expired and failed-provisioning history never authorizes access", () => {
  for (const status of ["REQUESTED","APPROVED","PROVISIONING","PROVISIONING_FAILED",
    "REVOKED","SUSPENDED","EXPIRED","REJECTED"]) {
    const result=hydrate([permission({status})]);
    assert.deepEqual(result,{ok:true,kind:"DORMANT_PERSISTENCE_PROPOSAL",evidence:[]});
  }
  assert.deepEqual(hydrate([permission({expiresAtMs:now})]).evidence,[]);
  denied(hydrate([permission({effectiveFromMs:now+1})]),"MALFORMED_ROW");
  denied(hydrate([permission({expiresAtMs:now-2000})]),"MALFORMED_ROW");
  denied(hydrate([permission({provisioningStatus:"FAILED"})]),"MALFORMED_ROW");
  denied(hydrate([permission({provisioningStatus:"PENDING"})]),"MALFORMED_ROW");
});

test("multiple approved sources remain separate; duplicate IDs and invalid principals deny the entire snapshot", () => {
  const restriction=permission({
    sourceId:"restriction-12",sourceKind:"INDIVIDUAL_RESTRICTION",
    roleVersion:null,capability:"sourcing-quotes:view",
    scope:{kind:"OWN_RECORD"}
  });
  const result=hydrate([permission(),restriction]);
  assert.equal(result.ok,true);
  assert.deepEqual(result.evidence.map(x=>x.sourceId),["role-assignment-7","restriction-12"]);
  assert.equal(result.evidence[1].sourceKind,"INDIVIDUAL_RESTRICTION");
  denied(hydrate([permission(),permission()]),"CONFLICTING_SOURCE");
  denied(hydrate([permission(),permission({principalId:"wrong",sourceId:"grant-2"})]),"MALFORMED_ROW");
  denied(hydrate([permission(),permission({roleVersion:0,sourceId:"bad"})]),"MALFORMED_ROW");
  denied(hydrate([permission({sourceKind:"INDIVIDUAL_GRANT",roleVersion:3})]),"MALFORMED_ROW");
});

test("malformed scope or missing context denies, never broadens scope", () => {
  for(const scope of [
    {kind:"STATE",stateCode:""},
    {kind:"PROJECT",projectId:"*extra",unexpected:true},
    {kind:"LOCAL_GOVERNMENT",stateCode:"LA"},
    {kind:"COMPANY",staffId:"everyone"},
    {kind:"UNKNOWN",id:"anything"},
    null
  ]) denied(hydrate([permission({scope})]),"MALFORMED_ROW");
  denied(hydrate([permission()],{principalId:""}),"INVALID_CONTEXT");
  denied(hydrate("not array"),"INVALID_CONTEXT");
  denied(hydrate([permission()],{atMs:Infinity}),"INVALID_CONTEXT");
});

test("candidate SQL cannot be applied as a Prisma or Supabase migration", () => {
  assert.ok(sqlPath.startsWith("docs/implementation/drafts/"));
  assert.ok(sqlPath.endsWith(".sql.disabled"));
  assert.match(sql,/^BEGIN;\nDO \$r01_3c2_unapproved\$/m);
  assert.match(sql,/RAISE EXCEPTION 'R01\.3C\.2 NOT APPROVED/);
  assert.match(sql,/ROLLBACK;\s*$/);
  assert.doesNotMatch(sql,/\bGRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+/i);
  assert.match(sql,/REVOKE ALL ON ALL TABLES IN SCHEMA smarthub_admin_access FROM PUBLIC, anon, authenticated/);
  for(const table of [
    "staff_directory_records","role_templates","role_template_versions",
    "role_version_capabilities","principal_role_assignments",
    "individual_permission_exceptions","access_change_events"
  ]) {
    assert.ok(sql.includes("smarthub_admin_access."+table),table);
    assert.ok(sql.includes("ALTER TABLE smarthub_admin_access."+table+" ENABLE ROW LEVEL SECURITY"),table);
    assert.ok(sql.includes("ALTER TABLE smarthub_admin_access."+table+" FORCE ROW LEVEL SECURITY"),table);
  }
  assert.match(sql,/access_change_events_immutable/);
  assert.match(sql,/BEFORE UPDATE OR DELETE/);
  assert.match(sql,/CHECK \(approved_by_account_id IS NULL OR approved_by_account_id <> principal_account_id\)/);
  assert.match(sql,/CHECK \(expires_at IS NULL OR expires_at > effective_from\)/);
});

function walk(folder) {
  return readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
    const filename=path.join(folder,entry.name);
    return entry.isDirectory()?walk(filename):
      entry.isFile()&&/\.(?:ts|tsx)$/.test(entry.name)?[filename.replaceAll("\\","/")]:[];
  });
}

test("no live application importer, grant handler, or migration activates draft persistence", () => {
  const imports=walk("src").filter(file=>file!==modulePath &&
    read(file).includes("proposed-permission-hydration"));
  assert.deepEqual(imports,[], "Proposed persistent evidence must never authorize live requests");
  const runtimeGuard=read("src/server/admin/guard.ts");
  assert.doesNotMatch(runtimeGuard,/hydrateProposedPermissionRows|proposed-permission-hydration/);
  assert.match(runtimeGuard,/evaluateCurrentAdminCapability/);
  const schema=read("prisma/schema.prisma");
  assert.doesNotMatch(schema,/model AdminRoleTemplate\s*\{|model AdminIndividualPermission\s*\{/);
  const gates=JSON.parse(read("docs/implementation/r00-gates.json")).gates;
  for(const id of ["R00-D01","R00-D04","R00-D09"]) {
    assert.equal(gates.find(g=>g.id===id)?.status,"PENDING_OWNER_DECISION");
  }
});
