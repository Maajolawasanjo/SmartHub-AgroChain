import {z} from "zod";
import {NIGERIA_STATES} from "@/features/auth/auth-rules";

export const requestId=z.uuid();
export const requestStatus=z.enum(["DRAFT","SUBMITTED","UNDER_REVIEW","MORE_INFO_REQUIRED","SOURCING_IN_PROGRESS","CLOSED","CANCELLED"]);
export const requestUnit=z.enum(["KG","TONNE","BAG","PIECE"]);
export const fulfilmentMethod=z.enum(["SMARTHUB_DELIVERY","BUYER_PICKUP","THIRD_PARTY"]);
const short=(max:number)=>z.string().trim().max(max).default("");
const date=z.union([z.iso.date(),z.literal("")]).default("");
const state=z.union([z.enum(NIGERIA_STATES as unknown as [string,...string[]]),z.literal("")]).default("");
export const requestLineDraft=z.strictObject({
 commodityId:z.union([z.uuid(),z.literal("")]).default(""),commodityName:short(120),
 typeId:z.union([z.uuid(),z.literal("")]).default(""),specificationId:z.union([z.uuid(),z.literal("")]).default(""),
 variety:short(120),quantity:z.union([z.string(),z.number()]).transform(String).pipe(z.string().trim().max(25)).default(""),
 unit:z.union([requestUnit,z.literal("")]).default(""),flexible:z.boolean().default(false),
 packaging:short(160),qualityNotes:short(1500),
});
export const requestDraft=z.strictObject({
 deliveryState:state,deliveryCity:short(120),deliveryAddress:short(240),
 requiredDate:date,fulfilmentMethod:z.union([fulfilmentMethod,z.literal("")]).default(""),
 notes:short(2000),lines:z.array(requestLineDraft).min(1).max(5),
});
export type RequestDraft=z.infer<typeof requestDraft>;
const quantityPattern=/^(?:0|[1-9]\d{0,11})(?:\.\d{1,3})?$/;
export function validateSubmittedDraft(value:RequestDraft){
 if(!value.deliveryState||value.deliveryCity.length<2||!value.fulfilmentMethod)
  throw new Error("Select a delivery state, city/LGA and fulfilment method before submitting.");
 if(value.fulfilmentMethod==="SMARTHUB_DELIVERY"&&value.deliveryAddress.length<8)
  throw new Error("Provide a delivery address for SmartHub-coordinated delivery.");
 if(!value.requiredDate)throw new Error("Choose a required date or delivery window start.");
 const requested=new Date(`${value.requiredDate}T00:00:00.000Z`);
 const today=new Date();const currentDate=Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate());
 if(!Number.isFinite(requested.getTime())||requested.getTime()<currentDate)
  throw new Error("The required date cannot be in the past.");
 for(const [index,line] of value.lines.entries()){
  if(!line.commodityId&&line.commodityName.length<2)throw new Error(`Item ${index+1}: select a commodity or describe the unlisted commodity.`);
  if(!quantityPattern.test(line.quantity)||Number(line.quantity)<=0||Number(line.quantity)>1000000000)
   throw new Error(`Item ${index+1}: enter a positive quantity with up to three decimal places.`);
  if(!line.unit)throw new Error(`Item ${index+1}: select a unit.`);
  if(line.unit==="BAG"&&line.packaging.length<5)throw new Error(`Item ${index+1}: specify the bag size or packaging.`);
  if(!line.commodityId&&(line.typeId||line.specificationId))throw new Error(`Item ${index+1}: unlisted commodities cannot use catalogue specifications.`);
 }
 return value;
}
export const requestMutation=z.strictObject({expectedVersion:z.number().int().positive(),payload:requestDraft});
export const requestCreate=z.strictObject({action:z.enum(["draft","submit"]),idempotencyKey:z.uuid(),payload:requestDraft});
export const requestSave=z.strictObject({action:z.enum(["draft","submit"]),expectedVersion:z.number().int().positive(),payload:requestDraft});
export const requestResponse=z.strictObject({expectedVersion:z.number().int().positive(),answer:z.string().trim().min(5).max(2000),payload:requestDraft});
export const requestCancel=z.strictObject({expectedVersion:z.number().int().positive(),reason:z.string().trim().min(5).max(1000)});
export const requestClaim=z.strictObject({override:z.boolean().default(false),reason:short(500),dueAt:z.union([z.iso.datetime({offset:true}),z.literal("")]).default("")});
export const requestReview=z.strictObject({
 action:z.enum(["start_review","request_information","start_sourcing","close"]),
 note:z.string().trim().min(10).max(2000),expectedVersion:z.number().int().positive(),
});
