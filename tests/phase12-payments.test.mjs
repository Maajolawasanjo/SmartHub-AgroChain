import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const schema=read("prisma/schema.prisma");
const sql=read("prisma/migrations/20261104060000_payments_reconciliation/migration.sql");
const provider=read("src/server/payments/paystack.ts");
const checkout=read("src/server/payments/checkout.ts");
const reconcile=read("src/server/payments/reconciliation.ts");
const webhook=read("src/server/payments/webhook.ts");
const common=read("src/server/payments/common.ts");
const refund=read("src/server/payments/refunds.ts");
test("Phase 12 defines secure financial relational models and full route wiring",()=>{
 for(const model of ["PaymentObligation","PaymentAttempt","PaymentProviderEvent","PaymentReconciliation","RefundRequest"])
  assert.ok(schema.includes("model "+model+" {"),model);
 for(const path of [
  "src/app/api/buyer/payments/checkout/route.ts",
  "src/app/api/buyer/payments/[id]/verify/route.ts",
  "src/app/api/operations/payments/[id]/reconcile/route.ts",
  "src/app/api/payments/paystack/webhook/route.ts",
  "src/app/api/buyer/payments/refunds/route.ts",
  "src/app/api/admin/payments/refunds/[id]/review/route.ts",
  "src/app/dashboard/payments/page.tsx",
  "src/app/dashboard/payments/[id]/page.tsx",
  "src/app/dashboard/payments/return/page.tsx",
  "src/app/operations/payments/page.tsx",
  "src/app/operations/payments/[id]/page.tsx",
  "src/app/admin/payments/refunds/page.tsx"
 ])assert.ok(existsSync(path),path);
});
test("provider request uses private API secret, exact NGN minor units, verified response and approved HTTPS checkout",()=>{
 assert.match(provider,/process\.env\.PAYSTACK_SECRET_KEY/);
 assert.match(provider,/https:\/\/api\.paystack\.co/);
 assert.match(provider,/\/transaction\/initialize/);
 assert.match(provider,/\/transaction\/verify\//);
 assert.match(provider,/amount:input\.amountMinor\.toString\(\)/);
 assert.match(provider,/url\.hostname!=="checkout\.paystack\.com"/);
 assert.match(common,/minor\.isInteger\(\)/);
 assert.match(common,/Number\.MAX_SAFE_INTEGER/);
 assert.match(sql,/payment_obligations_amount_positive/);
});
test("checkout fails closed without explicit launch permission and creates one durable attempt first",()=>{
 assert.match(checkout,/process\.env\.PAYMENTS_ENABLED!=="true"/);
 assert.match(checkout,/secretKey\(\);checkoutCallback\(\)/);
 assert.match(checkout,/order\.organizationId!==member\.organizationId/);
 assert.match(checkout,/payable\(order\)/);
 assert.match(checkout,/status:\{in:\["INITIATING","READY","UNKNOWN","VERIFIED"\]\}/);
 assert.match(checkout,/tx\.paymentAttempt\.create/);
 assert.ok(checkout.indexOf("tx.paymentAttempt.create")<checkout.indexOf("initializeProvider"),"write durable attempt before provider call");
 assert.match(sql,/payment_obligations_orderId_key/);
 assert.match(sql,/payment_attempts_reference_key/);
});
test("webhook validates modern timestamp-signed signature or legacy raw-body HMAC without downgrade",()=>{
 assert.match(provider,/headers\.get\("paystack-signature"\)/);
 assert.match(provider,/PAYSTACK_WEBHOOK_SECRET/);
 assert.match(provider,/Math\.abs\(nowSeconds-timestamp\)>300/);
 assert.match(provider,/timingSafeEqual/);
 assert.match(provider,/update\(raw\)/);
 assert.match(provider,/headers\.get\("x-paystack-signature"\)/);
 assert.match(webhook,/verifyWebhookSignature\(raw,headers\)/);
 assert.match(webhook,/payloadHash=hashPayload\(raw\)/);
 assert.match(sql,/payment_provider_events_payloadHash_key/);
});
test("provider event never directly marks payment paid",()=>{
 assert.match(webhook,/reconcileReference\(reference,"WEBHOOK"\)/);
 assert.doesNotMatch(webhook,/\b(?:order|paymentObligation)\.update/);
 assert.match(reconcile,/verifyProvider\(reference\)/);
 assert.match(reconcile,/verified\.status!=="success"/);
 assert.match(reconcile,/providerDomainValid\(verified\)/);
 assert.match(reconcile,/verified\.customer\.email\.toLowerCase\(\)/);
 assert.match(reconcile,/amount!==obligation\.amountMinor/);
 assert.match(reconcile,/providerTransactionId:transactionId/);
});
test("payment verification serializes against cancellation and checks active reservations",()=>{
 assert.match(common,/FOR UPDATE/);
 assert.match(common,/TransactionIsolationLevel\.Serializable/);
 assert.match(common,/reservation\?\.status!=="ACTIVE"/);
 assert.match(reconcile,/order\.status!=="PENDING_PAYMENT"/);
 assert.match(reconcile,/order\.holdExpiresAt\.getTime\(\)<=Date\.now\(\)/);
 assert.match(reconcile,/reservation\?\.status==="ACTIVE"/);
 assert.match(reconcile,/status:"PAYMENT_VERIFIED"/);
 assert.match(reconcile,/status:"PAID"/);
 assert.match(reconcile,/orderStatusEvent\.create/);
});
test("late charges, wrong amounts, reused transaction identifiers, and reversals enter financial review",()=>{
 assert.match(reconcile,/providerTransactionId:transactionId,id:\{not:attempt\.id\}/);
 assert.match(reconcile,/if\(invalid\)/);
 assert.match(reconcile,/LATE_PAYMENT/);
 assert.match(reconcile,/REVIEW_REQUIRED/);
 assert.match(reconcile,/repeatVerified/);
});
test("buyers cannot change amounts and callback page is informational",()=>{
 const page=read("src/app/dashboard/payments/return/page.tsx");
 const actions=read("src/features/payments/payment-actions.tsx");
 const order=read("src/app/dashboard/orders/[id]/page.tsx");
 assert.match(page,/does not mean Paystack collected or verified any payment/);
 assert.doesNotMatch(page,/\b(?:updateMany|create|verifyProvider)\(/);
 assert.match(actions,/post\("\/api\/buyer\/payments\/checkout",\{orderId\}\)/);
 assert.match(order,/canPay/);
 assert.match(read("src/app/api/buyer/payments/checkout/route.ts"),/assertSameOrigin\(request\)/);
});
test("refund review never issues provider transfers or unverified disbursements",()=>{
 assert.match(refund,/obligation\.status!=="PAID"/);
 assert.match(refund,/account\.role!=="SUPER_ADMIN"/);
 assert.doesNotMatch(refund,/fetch\(|transfer|providerRefund/);
 assert.match(schema,/enum RefundCaseStatus/);
});
test("new financial tables use RLS with public Data API denial",()=>{
 for(const table of ["payment_obligations","payment_attempts","payment_provider_events","payment_reconciliations","refund_requests"])
  assert.ok(sql.includes('ALTER TABLE "'+table+'" ENABLE ROW LEVEL SECURITY'),table);
 assert.match(sql,/REVOKE ALL ON TABLE/);
 assert.match(sql,/FROM anon, authenticated/);
});
