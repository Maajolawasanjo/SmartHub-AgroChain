import {z} from "zod";
export const id=z.uuid();
export const bankDetails=z.strictObject({
 bankCode:z.string().trim().regex(/^\d{3,12}$/),
 accountNumber:z.string().trim().regex(/^\d{10}$/),
 attestation:z.literal(true)
});
export const supplierTerms=z.strictObject({
 orderLineId:id,
 unitPriceNgn:z.string().regex(/^(?:[1-9]\d{0,11})(?:\.\d{1,2})?$/),
 note:z.string().trim().min(15).max(2000)
});
export const farmerDecision=z.strictObject({
 action:z.enum(["accept","decline"]),
 expectedVersion:z.number().int().positive(),
 attestation:z.literal(true)
});
export const approval=z.strictObject({
 decision:z.literal("approve"),
 reason:z.string().trim().min(20).max(1500)
});
export const settle=z.strictObject({
 confirmation:z.literal(true)
});
