import {z} from "zod";
export const orderId=z.uuid();
export const lotCreate=z.strictObject({
 supplyId:z.uuid(),
 locationNote:z.string().trim().min(5).max(240)
});
export const orderCreate=z.strictObject({
 quotationId:z.uuid(),
 expectedQuoteVersion:z.number().int().positive(),
 holdExpiresAt:z.iso.datetime({offset:true})
});
export const orderRelease=z.strictObject({
 action:z.enum(["cancel","expire"]),
 expectedVersion:z.number().int().positive(),
 reason:z.string().trim().min(10).max(2000)
});
