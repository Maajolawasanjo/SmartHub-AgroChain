import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const code=readFileSync("src/server/payments/reconciliation.ts","utf8");

test("provider reversal freezes an already delivered but disputed order",()=>{
 const freeze=code.slice(code.indexOf("async function freezeVerifiedOrder"),code.indexOf("export async function reconcileReference"));
 assert.match(freeze,/\["PAYMENT_VERIFIED","FULFILLING","COMPLETED","DELIVERY_REVIEW"\]\.includes\(order\.status\)/);
 assert.match(freeze,/status:"PAYMENT_REVIEW"/);
 assert.match(freeze,/orderStatusEvent\.create/);
});
test("previously verified provider transaction is never rewritten as UNKNOWN during late review",()=>{
 const start=code.indexOf("if(late){");
 const end=code.indexOf('const changed=await tx.order.updateMany',start);
 assert.ok(start>=0 && end>start);
 const late=code.slice(start,end);
 assert.match(late,/if\(attempt\.status!=="VERIFIED"\)/);
 assert.match(late,/status:"UNKNOWN"/);
 assert.match(late,/status:"REVIEW_REQUIRED"/);
 assert.match(late,/freezeVerifiedOrder/);
});
test("payment can be marked paid only after independent provider verification and active stock reservation",()=>{
 assert.match(code,/await verifyProvider\(reference\)/);
 assert.match(code,/providerDomainValid\(verified\)/);
 assert.match(code,/reservation\?\.status==="ACTIVE"/);
 assert.match(code,/status:"PAYMENT_VERIFIED"/);
 assert.match(code,/status:"PAID"/);
});
