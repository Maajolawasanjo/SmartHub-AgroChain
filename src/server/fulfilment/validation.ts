import {z} from "zod";
export const id=z.uuid();
const qty=z.string().trim().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,3})?$/);
export const createPlan=z.strictObject({
 orderId:id,
 destinationState:z.string().trim().min(2).max(60),
 destinationCity:z.string().trim().min(2).max(120),
 destinationAddress:z.string().trim().min(8).max(240),
 handlingNote:z.string().trim().max(1000).default("")
});
export const createShipment=z.strictObject({
 planId:id,carrierName:z.string().trim().min(2).max(160),
 carrierContact:z.string().trim().max(80).default(""),
 vehicleNote:z.string().trim().max(160).default(""),
 trackingReference:z.string().trim().max(120).default(""),
 lines:z.array(z.strictObject({orderLineId:id,quantity:qty})).min(1).max(5)
});
export const milestone=z.strictObject({
 action:z.enum(["pickup","dispatch","deliver","cancel"]),
 evidenceId:id.optional(),
 note:z.string().trim().min(8).max(2000)
});
export const receipt=z.strictObject({
 attestation:z.literal(true),
 lines:z.array(z.strictObject({shipmentLineId:id,acceptedQuantity:qty})).min(1).max(5),
 note:z.string().trim().max(2000).default("")
});
export const reportIssue=z.strictObject({
 category:z.enum(["SHORTAGE","DAMAGED","WRONG_ITEM","QUALITY","NOT_RECEIVED","OTHER"]),
 description:z.string().trim().min(15).max(2000)
});
export const reviewIssue=z.strictObject({
 action:z.enum(["UNDER_REVIEW","RESOLUTION_REQUIRED"]),
 note:z.string().trim().min(20).max(2000)
});
