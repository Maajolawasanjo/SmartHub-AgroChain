import {z} from "zod";

export const uid=z.uuid();
const decimal=z.string().trim().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,3})?$/);
const money=z.string().trim().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/);
export const proposeMatch=z.strictObject({
 requestLineId:uid,supplyId:uid,quantity:decimal,
 note:z.string().trim().max(1000).default("")
});
export const inviteMatch=z.strictObject({matchId:uid});
export const farmerRespond=z.strictObject({action:z.enum(["INTERESTED","DECLINED"]),note:z.string().trim().max(1000).default("")});
export const prepareQuotation=z.strictObject({
 requestId:uid,
 expectedVersion:z.number().int().positive().optional(),
 terms:z.string().trim().min(20).max(4000),
 validUntil:z.iso.datetime({offset:true}),
 lines:z.array(z.strictObject({matchId:uid,unitPriceNgn:money})).min(1).max(5)
});
export const transitionQuotation=z.strictObject({
 action:z.enum(["submit","approve","reject","issue","expire"]),
 expectedVersion:z.number().int().positive(),
 note:z.string().trim().max(2000).default("")
});
export const decideQuotation=z.strictObject({
 decision:z.enum(["accept","decline"]),
 expectedVersion:z.number().int().positive(),
 note:z.string().trim().max(2000).default("")
});
