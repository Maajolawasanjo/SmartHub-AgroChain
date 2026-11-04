import {z} from "zod";
export const uuid=z.uuid();
export const checkoutCreate=z.strictObject({orderId:uuid});
export const refundCreate=z.strictObject({obligationId:uuid,reason:z.string().trim().min(15).max(2000)});
export const refundReview=z.strictObject({
 action:z.enum(["UNDER_REVIEW","REJECTED","RESOLUTION_REQUIRED"]),
 note:z.string().trim().min(20).max(2000)
});
