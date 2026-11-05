import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const read=(p)=>readFileSync(p,"utf8");
const schema=read("prisma/schema.prisma");
const migration=read("prisma/migrations/20261104080000_supplier_settlements/migration.sql");
const common=read("src/server/settlements/common.ts");
const accounts=read("src/server/settlements/banking.ts");
const agreement=read("src/server/settlements/agreements.ts");
const approval=read("src/server/settlements/approval.ts");
const transfer=read("src/server/settlements/transfer.ts");
const reconcile=read("src/server/settlements/reconciliation.ts");
const provider=read("src/server/settlements/paystack-transfers.ts");
test("phase 14 includes all supplier consent, transfer and reconciliation models plus scoped API/portal screens",()=>{
 for(const model of ["FarmerPayoutAccount","SupplierAgreement","SupplierObligation","SupplierSettlementAttempt","SupplierSettlementReconciliation"])
  assert.ok(schema.includes("model "+model+" {"),model);
 for(const path of [
  "src/app/api/farmer/settlements/bank/route.ts",
  "src/app/api/operations/settlements/terms/route.ts",
  "src/app/api/farmer/settlements/agreements/[id]/decision/route.ts",
  "src/app/api/operations/settlements/agreements/[id]/obligation/route.ts",
  "src/app/api/admin/settlements/[id]/approve/route.ts",
  "src/app/api/operations/settlements/[id]/transfer/route.ts",
  "src/app/api/operations/settlements/attempts/[id]/reconcile/route.ts",
  "src/app/api/admin/settlements/attempts/[id]/reconcile/route.ts",
  "src/app/farmer/settlements/page.tsx",
  "src/app/operations/settlements/page.tsx",
  "src/app/operations/settlements/[id]/page.tsx",
  "src/app/admin/settlements/page.tsx"
 ])assert.ok(existsSync(path),path);
});
test("farmer bank details are Paystack-resolved and AES-256-GCM encrypted, never exposed to direct public SQL",()=>{
 assert.match(provider,/createCipheriv\("aes-256-gcm"/);
 assert.match(provider,/createDecipheriv\("aes-256-gcm"/);
 assert.match(provider,/createHmac\("sha256"/);
 assert.match(provider,/FARMER_BANK_ENCRYPTION_KEY/);
 assert.match(provider,/\/bank\/resolve\?/);
 assert.match(accounts,/beneficiaryMatchesFarmer/);
 assert.match(accounts,/farmer\?\.status!=="VERIFIED"/);
 assert.match(accounts,/encryptedNumber:encryptNumber\(value\.accountNumber\)/);
 assert.match(accounts,/pending>0/);
});
test("supplier price is explicit, separate from buyer quote and accepted only by the actual source farmer",()=>{
 assert.match(agreement,/new Prisma\.Decimal\(value\.unitPriceNgn\)/);
 assert.match(agreement,/status:"PROPOSED"/);
 assert.match(agreement,/offer\.farmerId!==account\.id/);
 assert.match(agreement,/offer\.version!==value\.expectedVersion/);
 assert.match(agreement,/status:"ACCEPTED"|"ACCEPTED"/);
 assert.doesNotMatch(agreement,/orderLine\.unitPriceNgn|quoteLine\.unitPriceNgn/);
 assert.match(migration,/supplier_agreements_orderLineId_key/);
});
test("supplier payable depends on complete receipt, paid order, no buyer refund or delivery issue",()=>{
 assert.match(common,/order\.status!=="COMPLETED"/);
 assert.match(common,/paymentObligation\?\.status!=="PAID"/);
 assert.match(common,/fulfillmentPlan\?\.status!=="COMPLETED"/);
 assert.match(common,/shipments\.some\(s=>s\.issue!==null\)/);
 assert.match(common,/refunds\.some/);
 assert.match(agreement,/receiptLine\.aggregate/);
 assert.match(agreement,/received\.eq\(offer\.orderLine\.quantity\)/);
 assert.match(agreement,/received\.mul\(offer\.unitPriceNgn\)/);
 assert.match(common,/minor\.isInteger\(\)/);
 assert.match(agreement,/tx\.supplierObligation\.findUnique/);
 assert.match(migration,/supplier_obligations_orderLineId_key/);
});
test("separate Super Admin approval snapshots verified bank fingerprint and exact payable",()=>{
 assert.match(approval,/lockAccount\(tx,account\.id,"SUPER_ADMIN"\)/);
 assert.match(approval,/payable\.agreement\.proposedById===account\.id/);
 assert.match(approval,/status:"APPROVED"/);
 assert.match(approval,/bankFingerprint:bank\.fingerprint,bankVersion:bank\.version/);
 assert.match(approval,/SUPPLIER_PAYABLE_APPROVED/);
});
test("real transfers are gated; only assigned Operations proposer, never independent approver, can initiate",()=>{
 assert.match(transfer,/SUPPLIER_PAYOUTS_ENABLED!=="true"/);
 assert.match(transfer,/lockAccount\(tx,account\.id,"OPERATIONS"\)/);
 assert.match(transfer,/reviewerScope\(tx,pre\.orderLine\.orderId,account\.id\)/);
 assert.match(transfer,/obligation\.approvedById===account\.id/);
 assert.match(transfer,/obligation\.agreement\.proposedById!==account\.id/);
 assert.match(transfer,/obligation\.attempts\.length/);
 assert.match(transfer,/status:"TRANSFER_PENDING"/);
 assert.match(transfer,/tx\.supplierSettlementAttempt\.create/);
 assert.ok(transfer.indexOf("tx.supplierSettlementAttempt.create")<transfer.indexOf("=await createTransferRecipient"));
});
test("outbound transfers use unique references and provider Verify Transfer, not browser or webhook status",()=>{
 assert.match(provider,/\/transferrecipient"/);
 assert.match(provider,/\/transfer"/);
 assert.match(provider,/\/transfer\/verify\//);
 assert.match(provider,/amount:input\.amountMinor\.toString\(\)/);
 assert.match(reconcile,/verifyTransfer\(reference\)/);
 assert.match(reconcile,/proof\.status==="success"/);
 assert.match(reconcile,/amount!==obligation\.amountMinor/);
 assert.match(reconcile,/proof\.recipient\.details\.account_number===decryptNumber\(attempt\.recipientEncryptedNumber\)/);
 assert.match(reconcile,/status:"SETTLED"/);
 assert.match(migration,/supplier_settlement_attempts_reference_key/);
});
test("payout intent snapshots original encrypted beneficiary for later historical checks",()=>{
 for(const field of ["recipientBankCode","recipientEncryptedNumber","recipientFingerprint","recipientAccountName"])
  assert.ok(schema.includes(field),field);
 assert.match(transfer,/recipientFingerprint:bank\.fingerprint/);
 assert.match(reconcile,/attempt\.recipientFingerprint===obligation\.bankFingerprint/);
});
test("missing or reversed provider settlements cannot be silently retried or shown paid",()=>{
 assert.match(transfer,/status:"UNKNOWN"/);
 assert.match(transfer,/obligation\.attempts\.length/);
 assert.match(reconcile,/REVIEW_REQUIRED/);
 assert.match(reconcile,/proof\.status==="success"/);
 assert.match(reconcile,/reversed/);
 assert.match(reconcile,/supplierSettlementReconciliation\.create/);
 assert.match(reconcile,/proof\.status!=="success"&&obligation\.status==="SETTLED"&&attempt\.status==="VERIFIED"/);
 assert.match(reconcile,/SUPPLIER_SETTLED_TRANSFER_RECHECK_FAILED/);
 assert.doesNotMatch(transfer,/status:"SETTLED"/);
});
test("signed Paystack transfer events trigger independent verify, not direct settlement update",()=>{
 const webhook=read("src/server/payments/webhook.ts");
 assert.match(webhook,/transfer\.success/);
 assert.match(webhook,/reconcileSupplierTransfer\(reference,"WEBHOOK"\)/);
 assert.match(webhook,/verifyWebhookSignature\(raw,headers\)/);
 assert.doesNotMatch(webhook,/supplierObligation\.update/);
});
test("supplier finance uses real farmer-scoped queries and no buyer price disclosure",()=>{
 const farmer=read("src/app/farmer/settlements/page.tsx");
 const ops=read("src/app/operations/settlements/page.tsx");
 assert.match(farmer,/farmerId:account\.id/);
 assert.doesNotMatch(farmer,/quoteLine\.unitPriceNgn|orderLine\.unitPriceNgn|buyerOrganization/);
 assert.match(ops,/assignedToId:account\.id/);
 assert.match(ops,/supplierAgreement/);
});
test("sensitive financial tables enable RLS and remove public API grants",()=>{
 for(const name of ["farmer_payout_accounts","supplier_agreements","supplier_obligations","supplier_settlement_attempts","supplier_settlement_reconciliations"])
  assert.ok(migration.includes('ALTER TABLE "'+name+'" ENABLE ROW LEVEL SECURITY'),name);
 assert.match(migration,/REVOKE ALL ON TABLE/);
 assert.match(migration,/FROM anon,authenticated/);
});
