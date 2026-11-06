import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");
const home=read("src/app/page.tsx");
const buyer=read("src/app/dashboard/page.tsx");
const farmer=read("src/app/farmer/page.tsx");
const operations=read("src/app/operations/page.tsx");

test("R00 approved V3 home copy and role onboarding actions are exact and functional routes",()=>{
 assert.match(home,/SmartHub AgroChain \| Agricultural Technology & Sourcing in Nigeria/);
 assert.match(home,/BUILDING A BETTER AGRICULTURAL SUPPLY CHAIN/);
 assert.match(home,/Connecting Agricultural Supply With <em>Real Market Demand<\/em>/);
 assert.match(home,/better sourcing, market access and supply-chain coordination/);
 assert.match(home,/primary=\{\{label:"Start a Buyer Request",href:"\/signup\?role=buyer"\}\}/);
 assert.match(home,/secondary=\{\{label:"Join as a Farmer",href:"\/signup\?role=farmer"\}\}/);
 assert.match(home,/Better information\. Better connections\. A more organised agricultural supply chain/);
 assert.match(home,/Connecting the People Who Move Agriculture Forward/);
 assert.doesNotMatch(home,/From the field to <em>real demand/);
 const signup=read("src/features/auth/components/live-auth.tsx");
 assert.match(signup,/new URLSearchParams\(window\.location\.search\)\.get\("role"\)/);
});

test("R00 buyer overview exposes the four prescribed real metrics only",()=>{
 for(const label of ["Active Requests","Quotes Awaiting Decision","Orders in Fulfilment","Payments Due"])assert.ok(buyer.includes('title:"'+label+'"'),label);
 assert.doesNotMatch(buyer,/title:"Orders Pending Payment"|title:"Open Payment Obligations"/);
 assert.match(buyer,/db\.order\.count\(\{where:\{organizationId:member\.organizationId,status:"FULFILLING"\}\}\)/);
 assert.match(buyer,/db\.paymentObligation\.count\(\{where:\{organizationId:member\.organizationId,status:"UNPAID"\}\}\)/);
 assert.match(buyer,/current\?\.number===q\.currentRevision&&!!current\.issuedAt&&current\.validUntil>now/);
 assert.match(buyer,/db\.buyerRequest\.count\(\{where:\{organizationId:member\.organizationId,status:"MORE_INFO_REQUIRED"\}\}\)/);
 assert.match(buyer,/attention\.length>0/);
 for(const href of ["/dashboard/products","/dashboard/requests","/dashboard/orders","/dashboard/payments"])assert.ok(buyer.includes('href="'+href+'"'),href);
 assert.match(buyer,/Metric not available/);
});

test("R00 Farmer overview reads owner-scoped order and opportunity counts without fabricated financial values",()=>{
 assert.match(farmer,/db\.order\.count\(\{where:\{lines:\{some:\{lot:\{supply:\{farmerId:account\.id\}\}\}\}/);
 assert.match(farmer,/holdExpiresAt:\{gt:today\}/);
 assert.match(farmer,/db\.matchProposal\.count\(\{where:\{supply:\{farmerId:account\.id\},status:"INVITED"/);
 assert.match(farmer,/requestLine:\{request:\{status:"SOURCING_IN_PROGRESS"\}\}/);
 assert.match(farmer,/\{activeTransactions\}/);
 assert.match(farmer,/\{matchedOpportunities\}/);
 assert.match(farmer,/A hold is not payment or settlement/);
 assert.doesNotMatch(farmer,/Not enabled yet|transaction module is available/);
});

test("R00 Operations overview matches implemented modules while retaining real counts",()=>{
 assert.match(operations,/matching, quotations, order reservations, fulfilment and financial review/);
 assert.match(operations,/db\.buyerRequest\.count/);
 assert.match(operations,/db\.order\.count/);
 assert.match(operations,/db\.fieldVisit\.count/);
 assert.doesNotMatch(operations,/separate future modules/);
});

test("R00 safety: payment, staff roles and quote acceptance remain unchanged by presentation corrections",()=>{
 const quote=read("src/server/commerce/service.ts");
 const payment=read("src/server/payments/checkout.ts");
 const perms=read("src/server/admin/permissions.ts");
 assert.match(quote,/export async function decideQuote/);
 assert.match(payment,/process\.env\.PAYMENTS_ENABLED!=="true"/);
 assert.match(perms,/STAFF_ROLES = \["FIELD_AGENT", "OPERATIONS"\]/);
});
