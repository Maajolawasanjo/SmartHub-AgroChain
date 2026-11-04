import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const schema=read("prisma/schema.prisma");
const migration=read("prisma/migrations/20261104050000_orders_inventory/migration.sql");
const common=read("src/server/orders/common.ts");
const lots=read("src/server/orders/inventory.ts");
const orders=read("src/server/orders/orders.ts");
test("Phase 11 data models and private API plus portal routes exist",()=>{
 for(const model of ["SupplyLot","Order","OrderLine","Reservation","StockMovement","OrderStatusEvent"])
  assert.ok(schema.includes("model "+model+" {"),model);
 for(const path of [
  "src/app/api/operations/lots/route.ts","src/app/api/operations/lots/[id]/status/route.ts",
  "src/app/api/operations/orders/route.ts","src/app/api/operations/orders/[id]/release/route.ts",
  "src/app/operations/inventory/page.tsx","src/app/operations/orders/page.tsx","src/app/operations/orders/[id]/page.tsx",
  "src/app/dashboard/orders/page.tsx","src/app/dashboard/orders/[id]/page.tsx","src/app/farmer/orders/page.tsx"
 ])assert.ok(existsSync(path),path);
});
test("physical lot intake uses approved supply, active verified farmer and physical inspection",()=>{
 for(const phrase of ['supply.status!=="APPROVED"','verification?.status!=="VERIFIED"','farmer.status!=="ACTIVE"',
  'inspection.observedUnit!==supply.unit','inspection.observedQuantity.lte(0)','Prisma.Decimal.min'])
  assert.ok(common.includes(phrase),phrase);
 assert.match(lots,/inspectionId:inspection\.id/);
 assert.match(lots,/kind:"RECEIVED"/);
 assert.match(migration,/supply_lots_supplyId_key/);
});
test("serializable transactions and sorted row locks prevent overselling",()=>{
 assert.match(common,/TransactionIsolationLevel\.Serializable/);
 assert.match(common,/P2034/);
 assert.match(common,/FOR UPDATE/);
 assert.match(orders,/\.sort\(\)/);
 assert.match(orders,/lockLot\(tx,id\)/);
 assert.match(orders,/available\.lt\(quantity\)/);
 assert.match(orders,/reservedQuantity:\{increment:amount\}/);
 assert.match(migration,/reservedQuantity" \+ "consumedQuantity" <= "quantity/);
});
test("order conversion checks buyer acceptance, issued revision and interested farmer match",()=>{
 for(const phrase of ['quote.status!=="ACCEPTED"','quote.buyerDecidedAt','revision.issuedAt',
  'revision.validUntil.getTime()<=Date.now()','lot.inspectionId!==inspection.id',
  'line.match.status!=="INTERESTED"','interest.response!=="INTERESTED"',
  'status:"PENDING_PAYMENT"','orderStatusEvent.create'])
  assert.ok(orders.includes(phrase),phrase);
 assert.match(common,/assignedToId!==reviewerId/);
 assert.match(migration,/orders_quotationId_key/);
});
test("one order per accepted quote, safe sequential retry only by original Operations creator",()=>{
 assert.match(orders,/tx\.order\.findUnique\(\{where:\{quotationId:quote\.id\}\}\)/);
 assert.match(orders,/previous\.createdById!==account\.id/);
 assert.match(schema,/quotationId\s+String @unique/);
 assert.match(orders,/existing:true/);
});
test("reservations and stock movements commit atomically, no payment or checkout",()=>{
 assert.match(orders,/tx\.reservation\.create/);
 assert.match(orders,/tx\.stockMovement\.create/);
 assert.match(orders,/kind:"RESERVED"/);
 assert.doesNotMatch(orders,/\b(?:payment|paymentAttempt|paymentObligation|providerEvent|checkout|settlement)\.create\(/);
 assert.match(migration,/stock_movements_reservation_link/);
});
test("release restores only active and entirely unconsumed reservations",()=>{
 assert.match(orders,/r\.status!=="ACTIVE"/);
 assert.match(orders,/status:"RELEASED",releasedAt:new Date\(\)/);
 assert.match(orders,/reservedQuantity:\{decrement:quantity\}/);
 assert.match(orders,/value\.action==="expire"/);
 assert.match(orders,/kind:"RELEASED"/);
 assert.match(migration,/reservations_terminal_exclusive/);
});
test("buyer, farmer and Operations reads remain scoped and compartmentalized",()=>{
 const buyer=read("src/app/dashboard/orders/[id]/page.tsx");
 const farmer=read("src/app/farmer/orders/page.tsx");
 const operations=read("src/app/operations/orders/[id]/page.tsx");
 assert.match(buyer,/organizationId:member\.organizationId/);
 assert.match(farmer,/farmerId:account\.id/);
 assert.match(operations,/assignedToId!==account\.id/);
 assert.doesNotMatch(buyer,/farmer:|supply:|lot:/);
 assert.doesNotMatch(farmer,/unitPriceNgn|totalNgn|businessName|contactEmail/);
});
test("RLS is enabled and public Data API privileges revoked for all new tables",()=>{
 for(const name of ["supply_lots","orders","order_lines","reservations","stock_movements","order_status_events"])
  assert.ok(migration.includes('ALTER TABLE "'+name+'" ENABLE ROW LEVEL SECURITY'),name);
 assert.match(migration,/REVOKE ALL ON TABLE/);
 assert.match(migration,/FROM anon, authenticated/);
});
test("quote acceptance does not automatically create stock reservations or pending orders",()=>{
 const operations=read("src/app/operations/quotes/[id]/page.tsx");
 const buyer=read("src/app/dashboard/quotes/[id]/page.tsx");
 assert.match(operations,/OrderConversionForm/);
 assert.match(operations,/quote\.status==="ACCEPTED"/);
 assert.doesNotMatch(buyer,/createPendingOrder|\/api\/operations\/orders/);
});
