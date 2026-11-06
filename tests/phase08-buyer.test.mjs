import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const actions=read("src/server/buyer/actions.ts");
const guard=read("src/server/buyer/guard.ts");
const migration=read("prisma/migrations/20261104020000_buyer_workspace/migration.sql");

test("buyer pages and APIs are real, not unauthenticated mock dashboards",()=>{
 for(const path of ["src/app/dashboard/page.tsx","src/app/dashboard/settings/page.tsx","src/app/dashboard/products/page.tsx","src/app/dashboard/products/[slug]/page.tsx","src/app/dashboard/requests/page.tsx","src/app/dashboard/orders/page.tsx","src/app/dashboard/payments/page.tsx","src/app/dashboard/notifications/page.tsx","src/app/api/buyer/profile/route.ts","src/app/api/buyer/specifications/route.ts","src/app/api/buyer/destinations/route.ts"]){assert.ok(existsSync(path),path)}
 assert.match(read("src/app/dashboard/page.tsx"),/requireBuyerPage\(\)/);
 assert.match(read("src/app/dashboard/settings/page.tsx"),/buyerMembership\(db,account\.id\)/);
 assert.match(read("src/app/dashboard/products/page.tsx"),/publicProducts\(q,category\)/);
});
test("buyer ownership, active status, verified email and membership are server-derived",()=>{
 assert.match(guard,/ctx\.account\.role!=="BUYER"/);
 assert.match(guard,/ctx\.account\.status!=="ACTIVE"/);
 assert.match(guard,/!ctx\.user\.email_confirmed_at/);
 assert.match(guard,/buyerMembership\.findUnique\(\{where:\{accountId\}/);
 assert.match(actions,/SELECT "id" FROM "app_accounts".*FOR UPDATE/);
 assert.match(actions,/buyerMembership\.create\(\{data:\{accountId:account\.id/);
 assert.match(migration,/CREATE UNIQUE INDEX "buyer_memberships_accountId_key"/);
});
test("profile completion is distinct from independent verification",()=>{
 const completeness=read("src/lib/buyer/profile.ts");
 assert.match(completeness,/REQUIRED_BUYER_PROFILE_FIELDS/);
 assert.match(completeness,/complete:missing\.length===0/);
 assert.match(actions,/PENDING_REVIEW","VERIFIED/);
 assert.match(migration,/"verificationStatus" "BuyerVerificationStatus" NOT NULL DEFAULT 'NOT_REQUESTED'/);
 assert.doesNotMatch(actions,/verificationStatus:\s*"VERIFIED"/);
});
test("saved commodity specifications require published catalog and matching type/spec",()=>{
 assert.match(actions,/publicPublished:true,category:\{is:\{active:true\}\}/);
 assert.match(actions,/commodityType\.findFirst\(\{where:\{id:value\.typeId,commodityId:commodity\.id,publicPublished:true\}/);
 assert.match(actions,/commoditySpecification\.findFirst\(\{where:\{id:value\.specificationId,commodityId:commodity\.id,publicPublished:true\}/);
 assert.match(actions,/buyerSavedSpecification\.create/);
 assert.match(actions,/organizationId:organization\.id/);
 assert.match(migration,/"quantity" DECIMAL\(18,3\) NOT NULL/);
});
test("delivery and specification mutations are organization-scoped and audited",()=>{
 assert.match(actions,/buyerDeliveryDestination\.deleteMany\(\{where:\{id,organizationId:organization\.id\}\}/);
 assert.match(actions,/buyerSavedSpecification\.deleteMany\(\{where:\{id,organizationId:organization\.id\}\}/);
 assert.match(actions,/member\?\.organizationId!==organizationId/);
 assert.match(actions,/BUYER_DESTINATION_REMOVED/);
 assert.match(actions,/BUYER_SPECIFICATION_REMOVED/);
});
test("new business tables are RLS protected and inaccessible through the public Data API",()=>{
 for(const table of ["buyer_organizations","buyer_memberships","buyer_delivery_destinations","buyer_saved_specifications","buyer_verification_events"]){
  assert.match(migration,new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`));
 }
 assert.match(migration,/REVOKE ALL ON TABLE/);
 assert.match(migration,/FROM anon, authenticated/);
});
test("phase 08 never invents requests, quotes, payments or orders",()=>{
 const dashboard=read("src/app/dashboard/page.tsx");
 assert.match(dashboard,/Metric not available/);
 assert.match(dashboard,/buyerSavedSpecification\.count/);assert.match(dashboard,/Orders in Fulfilment/);assert.match(dashboard,/Payments Due/);
 assert.doesNotMatch(actions,/\b(?:buyerRequest|quotation|order|payment|stockReservation)\.create\(/);
 assert.match(read("src/app/dashboard/payments/page.tsx"),/not a stored-value wallet/);
});
