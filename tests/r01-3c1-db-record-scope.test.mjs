import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = path => readFileSync(path, "utf8");
const source = read("src/server/field-agent/record-scope.ts");
const actions = read("src/server/field-agent/actions.ts");
const evidence = read("src/server/field-agent/evidence.ts");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20261104000000_field_agent_workflow/migration.sql");

class FakePublicError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function runContract(rows) {
  const queries = [];
  const fakeDb = {
    $queryRaw: async (parts, ...values) => {
      queries.push({ sql: parts.join("?"), values });
      return rows;
    }
  };
  const checkUuid = id => {
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new FakePublicError(404, "Record not found.");
    return id;
  };
  const code = stripTypeScriptTypes(
    source
      .replace(/^import "server-only";\n/, "")
      .replace(/^import \{[^\n]+\} from "[^\n]+";\n/gm, "")
      .replace(/^export /gm, ""), { mode: "strip" }
  );
  const handlers = new Function("PublicError", "getPrisma", "assertFieldRecordId",
    code + "\nreturn { requireCurrentAgentScopedVisit, findCurrentAgentReadyEvidencePath };"
  )(FakePublicError, () => fakeDb, checkUuid);
  return { ...handlers, queries };
}

const visitId = "00000000-0000-4000-8000-000000000001";
const evidenceId = "00000000-0000-4000-8000-000000000002";
const agentId = "00000000-0000-4000-8000-000000000003";

test("R01.3C.1 returns current scoped visit only when DB authorizes it", async () => {
  const allowed = runContract([{id:visitId}]);
  assert.deepEqual(await allowed.requireCurrentAgentScopedVisit(visitId,agentId),{id:visitId});
  assert.deepEqual(allowed.queries[0].values,[visitId,agentId]);
  const denied = runContract([]);
  await assert.rejects(denied.requireCurrentAgentScopedVisit(visitId,agentId),
    error=>error instanceof FakePublicError && error.status===404);
  assert.equal(denied.queries.length,1);
});

test("R01.3C.1 binds evidence path to the agent/visit/evidence IDs within one SELECT", async () => {
  const path = "private/one-visit/evidence.pdf";
  const allowed=runContract([{objectPath:path}]);
  assert.equal(await allowed.findCurrentAgentReadyEvidencePath(visitId,evidenceId,agentId),path);
  assert.equal(allowed.queries.length,1,"Cannot split scope check and evidence path lookup");
  assert.deepEqual(allowed.queries[0].values,[evidenceId,visitId,agentId]);
  const denied=runContract([]);
  assert.equal(await denied.findCurrentAgentReadyEvidencePath(visitId,evidenceId,agentId),null);
  assert.equal(denied.queries.length,1);
});

test("malformed IDs fail before a database query", async () => {
  const target=runContract([{objectPath:"private/should-not-return"}]);
  await assert.rejects(target.findCurrentAgentReadyEvidencePath("not-a-uuid",evidenceId,agentId),
    error=>error.status===404);
  await assert.rejects(target.requireCurrentAgentScopedVisit(visitId,"not-a-uuid"),
    error=>error.status===404);
  assert.equal(target.queries.length,0);
});

test("SQL binds both reads to an ACTIVE Field Agent and a live state assignment", () => {
  for(const sql of [runContract([]).requireCurrentAgentScopedVisit,
    runContract([]).findCurrentAgentReadyEvidencePath]){
    const method=sql.name;
    const block=source.slice(source.indexOf("export async function "+method));
    for(const check of [
      'JOIN "app_accounts" AS actor',
      'JOIN "farms" AS farm',
      'visit."fieldAgentId" = ${currentAgentId}::uuid',
      'actor."role" = \'FIELD_AGENT\'',
      'actor."status" = \'ACTIVE\'',
      'FROM "field_agent_assignments" AS assignment',
      'assignment."fieldAgentId" = actor."id"',
      'assignment."state" = farm."state"',
      'assignment."active" = TRUE',
      'LIMIT 1'
    ]) assert.ok(block.includes(check),method+" missing: "+check);
  }
  assert.match(source,/\$queryRaw<Array<\{ id: string \}>>\x60/);
  assert.match(source,/\$queryRaw<Array<\{ objectPath: string \}>>\x60/);
  assert.doesNotMatch(source,/\$queryRawUnsafe|\$executeRaw/);
});

test("evidence rows require exact visit, evidence and READY status in same DB predicate", () => {
  const method=source.slice(source.indexOf("export async function findCurrentAgentReadyEvidencePath"));
  for(const required of [
    'SELECT evidence."objectPath"',
    'FROM "field_visit_evidence" AS evidence',
    'JOIN "field_visits" AS visit ON visit."id" = evidence."visitId"',
    'evidence."id" = ${scopedEvidenceId}::uuid',
    'evidence."visitId" = ${scopedVisitId}::uuid',
    "evidence.\"status\" = 'READY'",
  ]) assert.ok(method.includes(required),required);
  assert.match(evidence,/findCurrentAgentReadyEvidencePath\(visitId,evidenceId,agentId\)/);
  assert.match(evidence,/if\(!objectPath\)throw new PublicError\(404/);
  assert.match(evidence,/createSignedUrl\(objectPath,60,\{download:true\}\)/);
  const section=evidence.slice(evidence.indexOf("export async function fieldEvidenceRedirect("),
    evidence.indexOf("export async function operationsEvidenceRedirect("));
  assert.doesNotMatch(section,/fieldVisitEvidence\.findFirst|assertAgentCanReadVisit/);
});

test("live visits reuse DB record scope but mutation locks and client roles are unchanged", () => {
  assert.match(actions,/return requireCurrentAgentScopedVisit\(visitId,agentId\)/);
  assert.match(actions,/await lockAgent\(tx,ctx\.account\.id\)/);
  assert.match(actions,/fieldAgentId:agentId,state:farm\.state,active:true/);
  assert.match(schema,/model FieldAgentAssignment/);
  assert.match(schema,/model FieldVisitEvidence/);
  assert.match(migration,/REVOKE ALL ON TABLE "field_visit_evidence" FROM anon, authenticated/);
  assert.match(migration,/ALTER TABLE "field_visit_evidence" ENABLE ROW LEVEL SECURITY/);
  const gates = JSON.parse(read("docs/implementation/r00-gates.json")).gates;
  for(const id of ["R00-D01","R00-D04","R00-D09"])
    assert.equal(gates.find(x=>x.id===id).status,"PENDING_OWNER_DECISION");
});
