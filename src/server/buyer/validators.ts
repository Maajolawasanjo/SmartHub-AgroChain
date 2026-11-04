import {z} from "zod";
import {NIGERIA_STATES} from "@/features/auth/auth-rules";

const optional=(max:number)=>z.string().trim().max(max).default("");
const state=z.enum(NIGERIA_STATES as unknown as [string,...string[]]);
export const buyerProfileInput=z.strictObject({
 businessName:optional(160),businessType:z.enum(["REGISTERED_COMPANY","SOLE_PROPRIETORSHIP","COOPERATIVE","PARTNERSHIP","OTHER",""]).default(""),
 registrationNumber:optional(80),contactName:optional(160),contactEmail:z.union([z.email().max(254),z.literal("")]).default(""),
 contactPhone:z.string().trim().max(24).regex(/^(?:\+?[0-9 ()-]{7,24})?$/,"Enter a valid business phone number.").default(""),
 state:z.union([state,z.literal("")]).default(""),city:optional(120),addressLine:optional(240),
 preferredContactMethod:z.enum(["EMAIL","PHONE","WHATSAPP"]).default("EMAIL"),
 expectedUpdatedAt:z.union([z.iso.datetime({offset:true}),z.literal("")]).default(""),
});
export const buyerDestinationInput=z.strictObject({
 label:z.string().trim().min(2).max(80),state,city:z.string().trim().min(2).max(120),
 addressLine:z.string().trim().min(8).max(240),contactName:optional(160),
 contactPhone:z.string().trim().max(24).regex(/^(?:\+?[0-9 ()-]{7,24})?$/).default(""),
});
export const buyerSpecificationInput=z.strictObject({
 commodityId:z.uuid(),typeId:z.union([z.uuid(),z.literal("")]).default(""),specificationId:z.union([z.uuid(),z.literal("")]).default(""),
 label:z.string().trim().min(2).max(120),quantity:z.union([z.string(),z.number()]).transform(String).pipe(z.string().regex(/^\d{1,12}(?:\.\d{1,3})?$/)).refine(x=>Number(x)>0,"Enter a positive quantity."),
 unit:z.enum(["KG","TONNE","BAG","PIECE"]),deliveryState:z.union([state,z.literal("")]).default(""),
 notes:optional(1000),
});
export const buyerDeleteInput=z.strictObject({id:z.uuid()});
export function assertBuyerId(id:string){if(!z.uuid().safeParse(id).success)throw new Error("Invalid record identifier.");return id;}
