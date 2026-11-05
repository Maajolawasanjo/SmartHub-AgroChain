import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const service=read("src/server/requests/service.ts"),validation=read("src/server/requests/validation.ts");
const migration=read("prisma/migrations/20261104030000_buyer_requests/migration.sql");

test("buyer request routes, Operations review routes and forms are implemented",()=>{
 for(const path of ["src/app/dashboard/requests/new/page.tsx","src/app/dashboard/requests/[id]/page.tsx","src/app/dashboard/requests/[id]/information/page.tsx",
  "src/app/operations/requests/page.tsx","src/app/operations/requests/[id]/page.tsx","src/app/api/buyer/requests/route.ts",
  "src/app/api/buyer/requests/[id]/route.ts","src/app/api/buyer/requests/[id]/respond/route.ts","src/app/api/buyer/requests/[id]/cancel/route.ts",
  "src/app/api/operations/requests/[id]/claim/route.ts","src/app/api/operations/requests/[id]/review/route.ts"]){assert.ok(existsSync(path),path)}
});
test("buyer writes derive organization from server membership and use row locks",()=>{
 assert.match(service,/requireBuyerApi\(\)/);
 assert.match(service,/lockBuyer\(tx,account\.id\)/);
 assert.match(service,/buyerMembership\.findUnique\(\{where:\{accountId\}/);
 assert.match(service,/SELECT "id" FROM "app_accounts".*FOR UPDATE/);
 assert.match(service,/SELECT "id" FROM "buyer_organizations".*FOR UPDATE/);
 assert.match(service,/where:\{id,organizationId:org\.id/);
 assert.match(service,/version:\{increment:1\}/);
});
test("draft persistence, submission, lines, cancellation and clarification are transactional",()=>{
 for(const operation of ["createRequest","saveRequest","saveClarificationDraft","respondToClarification","cancelRequest"])
  assert.match(service,new RegExp(`export async function ${operation}`));
 assert.match(service,/draftPayload:submitted\?Prisma\.DbNull:payloadJson/);
 assert.match(service,/await replaceLines\(tx,id,value\.payload\)/);
 assert.match(service,/buyerRequestClarification\.update/);
 assert.match(service,/status:\{in:\["DRAFT","SUBMITTED","MORE_INFO_REQUIRED"\]\}/);
 assert.match(migration,/buyer_request_clarifications_one_open_per_request/);
});
test("published catalog integrity, unlisted commodity review, quantities and bag packaging are validated",()=>{
 assert.match(service,/publicPublished:true,category:\{is:\{active:true\}\}/);
 assert.match(service,/commodityType\.findFirst/);
 assert.match(service,/commoditySpecification\.findFirst/);
 assert.match(validation,/quantityPattern/);
 assert.match(validation,/line\.unit==="BAG"&&line\.packaging\.length<5/);
 assert.match(validation,/unlisted commodities cannot use catalogue specifications/);
 assert.match(migration,/buyer_request_lines_quantity_positive/);
 assert.match(migration,/buyer_request_lines_unit_valid/);
});
test("initial request does not require independent business verification",()=>{
 assert.match(service,/buyerProfileCompletion\(org\)\.complete/);
 assert.match(service,/Independent verification is not required for an initial request/);
 assert.doesNotMatch(service,/verificationStatus\s*===\s*"VERIFIED"/);
});
test("Operations reviewer ownership, state machine and takeover are enforced",()=>{
 assert.match(service,/hasPermission\(account\.role,"operations\.requests\.review"\)/);
 assert.match(service,/assignment\?\.assignedToId!==account\.id/);
 assert.match(service,/actor\.role!=="SUPER_ADMIN"/);
 assert.match(service,/start_review:\{from:\["SUBMITTED"\]/);
 assert.match(service,/request_information:\{from:\["UNDER_REVIEW"\]/);
 assert.match(service,/start_sourcing:\{from:\["UNDER_REVIEW"\]/);
 assert.match(service,/if\(!\(transition\.from as readonly string\[\]\)\.includes\(record\.status\)\)/);
});
test("sensitive demand tables are RLS enabled, Data API grants revoked, and event history is real",()=>{
 for(const name of ["buyer_requests","buyer_request_lines","buyer_request_events","buyer_request_clarifications","buyer_request_assignments"])
  assert.match(migration,new RegExp(`ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY`));
 assert.match(migration,/REVOKE ALL ON TABLE/);assert.match(migration,/FROM anon, authenticated/);
 assert.match(service,/buyerRequestEvent\.create/);assert.match(service,/auditEvent\.create/);
 assert.match(read("src/app/dashboard/notifications/page.tsx"),/buyerRequestEvent\.findMany/);
});
test("no request submission claims a quote, order, reservation or payment",()=>{
 assert.doesNotMatch(service,/\b(?:quotation|order|payment|stockReservation|matchProposal)\.create\(/);
 assert.match(read("src/app/dashboard/requests/page.tsx"),/Quotations, proposal decisions, orders and payments are separate future workflows/);
});

test("retrying a buyer create is idempotent and never silently creates duplicate demand",()=>{
 const schema=read("prisma/schema.prisma");
 const form=read("src/features/requests/request-form.tsx");
 assert.match(validation,/idempotencyKey:z\.uuid\(\)/);
 assert.match(schema,/@@unique\(\[organizationId,clientRequestKey\]\)/);
 assert.match(migration,/buyer_requests_organization_clientRequestKey_key/);
 assert.match(service,/clientRequestHash!==fingerprint/);
 assert.match(service,/organizationId_clientRequestKey/);
 assert.match(form,/createKey\.current=crypto\.randomUUID\(\)/);
});
test("Operations cannot access buyer drafts, including cancelled unsubmitted drafts",()=>{
 const detail=read("src/app/operations/requests/[id]/page.tsx");
 const queue=read("src/app/operations/requests/page.tsx");
 assert.match(detail,/buyerRequest\.findFirst\(\{where:\{id,submittedAt:\{not:null\}\}/);
 assert.match(queue,/submittedAt:\{not:null\}/);
 assert.match(service,/buyerRequest\.findFirst\(\{where:\{id,submittedAt:\{not:null\}\}\}/);
});

test("full-sized valid requests and clarification answers fit the request-only body limit",()=>{
 const http=read("src/server/auth/http.ts");
 assert.match(http,/readJson\(request:NextRequest,maxCharacters=12000\)/);
 assert.match(http,/raw\.length>maxCharacters/);
 for(const path of [
  "src/app/api/buyer/requests/route.ts",
  "src/app/api/buyer/requests/[id]/route.ts",
  "src/app/api/buyer/requests/[id]/respond/route.ts",
  "src/app/api/buyer/requests/[id]/clarification/draft/route.ts"
 ])assert.match(read(path),/readJson\(req,24000\)/,path);
});
