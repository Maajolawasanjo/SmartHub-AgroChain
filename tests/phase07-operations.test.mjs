import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const service=read("src/server/operations/review.ts");
const migration=read("prisma/migrations/20261104010000_operations_review_controls/migration.sql");

test("Operations cases are claimed before decisions, with a single assignment per subject",()=>{
 assert.match(service,/assertAssigned\(tx,"verification",id,account\.id\)/);
 assert.match(service,/assertAssigned\(tx,"supply",id,account\.id\)/);
 assert.match(service,/kind_subjectId/);
 assert.match(service,/SUPER_ADMIN/);
 assert.match(service,/REVIEW_CASE_REASSIGNED/);
 assert.match(migration,/UNIQUE INDEX "operations_review_assignments_kind_subjectId_key"/);
});
test("reviewer status, permission and stale status are rechecked inside transactions",()=>{
 assert.match(service,/SELECT "id" FROM "app_accounts".*FOR UPDATE/);
 assert.match(service,/SELECT "id" FROM "farmer_verifications".*FOR UPDATE/);
 assert.match(service,/SELECT "id" FROM "supply_declarations".*FOR UPDATE/);
 assert.match(service,/status:"PENDING_REVIEW"/);
 assert.match(service,/maxWait:10000/);
 assert.match(service,/hasPermission\(reviewer\.role, permission\)/);
});
test("approval requires accepted field evidence, farmer identity, and farm provenance",()=>{
 assert.match(service,/reviewDecision:"ACCEPT_REPORT"/);
 assert.match(service,/evidence:\{some:\{status:"READY"\}\}/);
 assert.match(service,/farms\.some\(farm=>!covered\.has\(farm\.id\)\)/);
 assert.match(service,/farmerId:supply\.farmerId,farmId:supply\.farmId/);
 assert.match(service,/Farmer verification must remain approved/);
 assert.match(service,/supply\.farmerId===account\.id/);
});
test("physical quantity, unit, packaging and catalog specification are validated",()=>{
 assert.match(service,/value\.observedUnit!==supply\.unit/);
 assert.match(service,/value\.observedQuantity!==Number\(supply\.quantity\.toString\(\)\)/);
 assert.match(service,/supply\.unit==="BAG"/);
 assert.match(service,/commodityId:supply\.commodityId/);
 assert.match(service,/supplyInspectionAssessment\.create/);
 assert.match(migration,/CHECK \("observedQuantity" > 0\)/);
 assert.match(migration,/CHECK \("observedUnit" IN/);
});
test("new assessment and assignment tables are private to server-authorized database access",()=>{
 for(const table of ["operations_review_assignments","supply_inspection_assessments"]){
  assert.ok(migration.includes(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`));
  assert.ok(migration.includes(`"${table}"`));
 }
 assert.match(migration,/REVOKE ALL ON TABLE/);
 assert.match(migration,/FROM anon, authenticated/);
});
test("Operations review pages, filters, evidence links and claim route are real",()=>{
 for(const path of ["src/app/operations/verification/page.tsx","src/app/operations/verification/[id]/page.tsx",
 "src/app/operations/supply/page.tsx","src/app/operations/supply/[id]/page.tsx",
 "src/features/operations/review-controls.tsx","src/app/api/operations/reviews/[kind]/[id]/claim/route.ts"]){
  assert.ok(existsSync(path),path);
 }
 assert.match(read("src/features/operations/review-controls.tsx"),/fetch\(path,\{method:"POST"/);
 assert.match(read("src/app/api/operations/reviews/[kind]/[id]/claim/route.ts"),/assertSameOrigin\(req\)/);
 assert.match(read("src/app/operations/supply/[id]/page.tsx"),/api\/operations\/field-visits/);
 assert.match(read("src/app/operations/verification/page.tsx"),/skip:\(page-1\)\*25,take:25/);
});
test("approvals cannot create stock, reservations, orders or payment events",()=>{
 assert.doesNotMatch(service,/\b(?:reservation|order|payment|stockMovement)\.create\(/);
 assert.match(service,/tx\.supplyReviewEvent\.create/);
 assert.match(service,/tx\.farmerVerificationEvent\.create/);
 assert.match(service,/tx\.auditEvent\.create/);
});
