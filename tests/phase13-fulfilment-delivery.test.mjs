import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const read=(path)=>readFileSync(path,"utf8");
const schema=read("prisma/schema.prisma");
const sql=read("prisma/migrations/20261104070000_fulfilment_delivery/migration.sql");
const common=read("src/server/fulfilment/common.ts");
const ops=read("src/server/fulfilment/operations.ts");
const receipts=read("src/server/fulfilment/receipts.ts");
const evidence=read("src/server/fulfilment/evidence.ts");
test("phase 13 has real models, migration and buyer/operations routes",()=>{
 for(const model of ["FulfillmentPlan","Shipment","ShipmentLine","DeliveryEvent","ShipmentEvidence","ReceiptConfirmation","ReceiptLine","DeliveryIssue"])
  assert.ok(schema.includes("model "+model+" {"),model);
 for(const path of [
  "src/app/api/operations/fulfilment/plans/route.ts",
  "src/app/api/operations/fulfilment/shipments/route.ts",
  "src/app/api/operations/fulfilment/shipments/[id]/milestone/route.ts",
  "src/app/api/buyer/shipments/[id]/receipt/route.ts",
  "src/app/api/buyer/shipments/[id]/issue/route.ts",
  "src/app/api/operations/fulfilment/issues/[id]/review/route.ts",
  "src/app/api/shipments/[id]/evidence/route.ts",
  "src/app/api/shipments/[id]/evidence/[evidenceId]/route.ts",
  "src/app/operations/fulfilment/page.tsx",
  "src/app/operations/fulfilment/plan/[id]/page.tsx",
  "src/app/operations/fulfilment/shipments/[id]/page.tsx",
  "src/app/dashboard/shipments/page.tsx",
  "src/app/dashboard/shipments/[id]/page.tsx",
  "src/app/operations/disputes/page.tsx"
 ])assert.ok(existsSync(path),path);
});
test("transport requires clean payment and assigned Operations; no dispatch from a client redirect",()=>{
 assert.match(common,/paymentObligation\?\.status!=="PAID"/);
 assert.match(common,/assignment\?\.assignedToId!==actor\.id/);
 assert.match(common,/TransactionIsolationLevel\.Serializable/);
 assert.match(common,/FOR UPDATE/);
 assert.match(ops,/requirePaid\(order\)/);
 assert.match(ops,/if\(shipment\.plan\.status!=="ACTIVE"\)/);
 assert.match(ops,/evidenceId/);
 assert.match(ops,/status:"FULFILLING"/);
});
test("only buyer-confirmed physical receipts consume source stock",()=>{
 assert.doesNotMatch(ops,/kind:"CONSUMED"|consumedQuantity:\{increment:/);
 assert.match(receipts,/kind:"CONSUMED"/);
 assert.match(receipts,/reservedQuantity:\{decrement:accepted\}/);
 assert.match(receipts,/consumedQuantity:\{increment:accepted\}/);
 assert.match(receipts,/attestation/);
 assert.match(receipts,/shipment\.status/);
 assert.match(receipts,/order\.status!=="FULFILLING"/);
});
test("split shipments are quantity bounded across all active shipments",()=>{
 assert.match(ops,/status:\{not:"CANCELLED"\}/);
 assert.match(ops,/new Map<string,Prisma\.Decimal>/);
 assert.match(ops,/allocated\.gt\(original\.quantity\)/);
 assert.match(ops,/status:"CANCELLED"/);
 assert.match(sql,/shipment_lines_shipmentId_orderLineId_key/);
});
test("partial receipts record accepted and shortfall separately and never release missing goods",()=>{
 assert.match(schema,/model ReceiptLine/);
 assert.match(schema,/acceptedQuantity Decimal/);
 assert.match(schema,/shortageQuantity Decimal/);
 assert.match(receipts,/line\.quantity\.minus\(accepted\)/);
 assert.match(receipts,/status:"REVIEW_REQUIRED"/);
 assert.match(receipts,/SHORTAGE_REPORTED/);
 assert.match(receipts,/accepted\.lte\(0\)continue/);
 assert.match(receipts,/consumed\.gt\(line\.orderLine\.quantity\)/);
});
test("completion checks all ordered quantities, all receipts and unresolved issue count",()=>{
 assert.match(receipts,/allConsumed\.get\(line\.id\)/);
 assert.match(receipts,/unresolved===0&&fullyReceived/);
 assert.match(receipts,/status:"COMPLETED"/);
 assert.match(receipts,/orderStatusEvent\.create/);
 assert.match(receipts,/status:"CONSUMED",consumedAt:new Date/);
});
test("shipment milestones require uploaded ready and unused private evidence",()=>{
 assert.match(ops,/if\(!value\.evidenceId\)/);
 assert.match(ops,/e\.id===value\.evidenceId&&e\.status==="READY"/);
 assert.match(ops,/tx\.deliveryEvent\.findUnique\(\{where:\{evidenceId:evidence\.id\}/);
 assert.match(evidence,/SUPABASE|createSupabaseAdminClient/);
 assert.match(evidence,/createSignedUrl/);
 assert.match(evidence,/private/i);
 assert.match(evidence,/!fmt\.matches\(bytes\)/);
 assert.match(sql,/storage\.buckets/);
 assert.match(sql,/false,10485760/);
});
test("buyer and operator may access only their scoped delivery details",()=>{
 assert.match(common,/member\.role!=="OWNER"/);
 assert.match(common,/order\.quotation\.request\.assignment\?\.assignedToId!==actor\.id/);
 assert.match(receipts,/activeMember\.organizationId!==member\.organizationId/);
 assert.match(receipts,/order\.organizationId!==activeMember\.organizationId/);
 const buyer=read("src/app/dashboard/shipments/[id]/page.tsx");
 assert.match(buyer,/organizationId:member\.organizationId/);
 assert.doesNotMatch(buyer,/carrierContact|unitPriceNgn|lotId|supply:/);
 const opspage=read("src/app/operations/fulfilment/shipments/[id]/page.tsx");
 assert.match(opspage,/assignment\?\.assignedToId!==account\.id/);
});
test("issue review records investigation without automatic refunds, payout or stock restoration",()=>{
 assert.match(receipts,/status:"RESOLUTION_REQUIRED"|RESOLUTION_REQUIRED/);
 assert.match(receipts,/value\.action/);
 assert.match(receipts,/ISSUE_REVIEWED/);
 assert.doesNotMatch(receipts,/\b(?:refund|settlement|payout|supplierObligation)\.create\(/);
 assert.doesNotMatch(receipts,/kind:"RELEASED"|reservedQuantity:\{increment:/);
 assert.match(sql,/delivery_issues_shipmentId_key/);
});
test("revoked provider payment after dispatch freezes fulfilment before further receipt",()=>{
 const payments=read("src/server/payments/reconciliation.ts");
 assert.match(payments,/\["PAYMENT_VERIFIED","FULFILLING"\]\.includes\(order\.status\)/);
 assert.match(payments,/status:"PAYMENT_REVIEW"/);
 assert.match(common,/requirePaid/);
});
test("new tables enforce RLS and deny public Data API grants",()=>{
 for(const table of ["fulfillment_plans","shipments","shipment_lines","delivery_events","shipment_evidence","receipt_confirmations","receipt_lines","delivery_issues"])
  assert.ok(sql.includes('ALTER TABLE "'+table+'" ENABLE ROW LEVEL SECURITY'),table);
 assert.match(sql,/REVOKE ALL ON TABLE/);
 assert.match(sql,/FROM anon, authenticated/);
});
