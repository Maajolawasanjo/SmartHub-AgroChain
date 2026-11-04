import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const service=read("src/server/commerce/service.ts");
const schema=read("prisma/schema.prisma");
const sql=read("prisma/migrations/20261104040000_matching_quotations/migration.sql");
test("phase 10 domain tables and API endpoints are present",()=>{
 for(const name of ["MatchProposal","OpportunityInterest","Quotation","QuoteRevision","QuoteLine","QuoteApprovalEvent"])
  assert.match(schema,new RegExp("model "+name+" \\{"));
 for(const path of [
  "src/app/api/operations/matching/route.ts",
  "src/app/api/operations/matching/[id]/invite/route.ts",
  "src/app/api/farmer/opportunities/[id]/respond/route.ts",
  "src/app/api/operations/quotes/route.ts",
  "src/app/api/operations/quotes/[id]/transition/route.ts",
  "src/app/api/buyer/quotes/[id]/decision/route.ts",
  "src/app/operations/matching/page.tsx",
  "src/app/operations/matching/[id]/page.tsx",
  "src/app/operations/quotes/[id]/page.tsx",
  "src/app/admin/quotes/page.tsx",
  "src/app/dashboard/quotes/page.tsx",
  "src/app/dashboard/quotes/[id]/page.tsx",
  "src/app/farmer/opportunities/page.tsx"
 ])assert.ok(existsSync(path),path);
});
test("matching requires approved physical supply, verified farmer and accepted inspection",()=>{
 for(const phrase of ['supply.status!=="APPROVED"','verified?.status!=="VERIFIED"','assessment.observedUnit!==supply.unit','assessment.specificationId!==line.specificationId','quantity.gt(assessment.observedQuantity)'])
  assert.ok(service.includes(phrase),phrase);
 assert.match(service,/request\.status!=="SOURCING_IN_PROGRESS"/);
 assert.match(service,/assignment\?\.assignedToId!==actorId/);
});
test("opportunities are farmer-owned and require recorded invitation before response",()=>{
 assert.match(service,/match\.supply\.farmerId!==account\.id/);
 assert.match(service,/match\.status!=="INVITED"/);
 assert.match(service,/opportunityInterest\.create/);
 assert.match(sql,/opportunity_interests_matchId_key/);
});
test("quotes have immutable submitted revisions, independent approval and optimistic versioning",()=>{
 assert.match(schema,/@@unique\(\[quoteId,number\]\)/);
 assert.match(service,/quote\.version!==value\.expectedVersion/);
 assert.match(service,/actor\.role==="SUPER_ADMIN"/);
 assert.match(service,/revision\.createdById===account\.id/);
 assert.match(service,/where:\{id,version:quote\.version,status:quote\.status\}/);
 assert.match(service,/buyerDecidedAt:new Date\(\)/);
 assert.match(sql,/quotations_requestId_key/);
});
test("buyer quote read is scoped to organization and hides internal supplier contacts",()=>{
 const buyer=read("src/app/dashboard/quotes/[id]/page.tsx");
 assert.match(buyer,/organizationId:member\.organizationId/);
 assert.match(buyer,/status:\{in:\["ISSUED","ACCEPTED","DECLINED","EXPIRED"\]\}/);
 assert.doesNotMatch(buyer,/include:\{match:|include:\{supply:/);
 assert.match(service,/member\.role!=="OWNER"/);
 assert.match(service,/revision\.validUntil\.getTime\(\)<=Date\.now\(\)/);
});
test("no quote decision creates stock reservation, order or payment",()=>{
 assert.doesNotMatch(service,/\b(?:order|payment|reservation|stockMovement|settlement)\.create\(/);
 assert.match(read("src/features/commerce/commerce-actions.tsx"),/This will not create or pay for an order/);
});
test("all new tables have RLS enabled and public Data API grants revoked",()=>{
 for(const name of ["match_proposals","opportunity_interests","quotations","quote_revisions","quote_lines","quote_approval_events"])
  assert.ok(sql.includes('ALTER TABLE "'+name+'" ENABLE ROW LEVEL SECURITY'),name);
 assert.match(sql,/REVOKE ALL ON TABLE/);
 assert.match(sql,/FROM anon, authenticated/);
});
test("site navigation links only implemented Phase 10 workspaces",()=>{
 const nav=read("src/components/dashboard/navigation.ts");
 for(const p of ["/farmer/opportunities","/operations/matching","/dashboard/quotes","/admin/quotes"])
  assert.ok(nav.includes('active("')&&nav.includes(p),p);
});

test("Phase 09 closure cannot strand pending, issued or accepted quotations",()=>{
 const requestService=read("src/server/requests/service.ts");
 assert.match(requestService,/if\(value\.action==="close"\)/);
 assert.match(requestService,/PENDING_APPROVAL","APPROVED","ISSUED","ACCEPTED/);
 assert.match(requestService,/active or accepted quotation/);
});
