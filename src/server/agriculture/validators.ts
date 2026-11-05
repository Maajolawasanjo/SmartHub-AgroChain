import { z } from "zod";
import { NIGERIA_STATES } from "@/features/auth/auth-rules";

const id = z.string().uuid();
const text = (max:number) => z.string().trim().max(max);
const optionalText = (max:number) => text(max).optional().or(z.literal(""));
const date = z.iso.date().optional().or(z.literal(""));
const quantity = z.coerce.number().positive().max(1000000000).refine(v => Math.round(v * 1000) === v * 1000, "At most three decimal places.");
export const units = ["KG", "TONNE", "BAG", "PIECE"] as const;
export const farmInput = z.object({
  name: z.string().trim().min(2).max(160),
  state: z.string().refine(v=>NIGERIA_STATES.includes(v as (typeof NIGERIA_STATES)[number]),"Select a valid Nigerian state or FCT."),
  lga: z.string().trim().min(2).max(120),
  community:optionalText(160), locationNote:optionalText(500),
});

const cropDetails = {
  variety:optionalText(120),
  stage:z.enum(["PLANNED","GROWING","HARVESTED","INACTIVE"]).default("GROWING"),
  plantingDate:date, expectedHarvestAt:date,
  estimatedQuantity:z.union([quantity,z.literal(""),z.null()]).optional(),
  estimatedUnit:z.enum(units).optional().or(z.literal("")),
  notes:optionalText(2000),
};
function validateCrop(v:{estimatedQuantity?:number|string|null;estimatedUnit?:string;plantingDate?:string;expectedHarvestAt?:string},ctx:z.RefinementCtx){
  if(v.estimatedQuantity && !v.estimatedUnit)ctx.addIssue({code:"custom",path:["estimatedUnit"],message:"Select a unit for the estimated quantity."});
  if(v.plantingDate && v.expectedHarvestAt && v.expectedHarvestAt < v.plantingDate)ctx.addIssue({code:"custom",path:["expectedHarvestAt"],message:"Expected harvest cannot precede planting."});
}
export const cropInput = z.object({farmId:id,commodityId:id,...cropDetails}).superRefine(validateCrop);
// The source farm/commodity cannot be silently changed after creation: physical supply may reference this crop.
// An exact last-seen timestamp prevents overwriting a newer farmer edit from another browser/device.
export const cropUpdateInput = z.object({...cropDetails,updatedAt:z.iso.datetime({offset:true})}).superRefine(validateCrop);

export const supplyInput=z.object({
  farmId:id, cropId:id.optional().or(z.literal("")), commodityId:id,
  variety:optionalText(120), quantity, unit:z.enum(units), packaging:optionalText(160),
  harvestDate:date, reportedCondition:z.string().trim().min(2).max(160),
  storageNote:optionalText(1000), notes:optionalText(2000),
  action:z.enum(["draft","submit"]),
}).superRefine((v,ctx)=>{
  if(v.unit==="BAG" && (!v.packaging || v.packaging.trim().length<5))
    ctx.addIssue({code:"custom",path:["packaging"],message:"For bags, describe each package's net weight and units."});
});
export const supplyWithdrawalInput=z.object({reason:z.string().trim().min(5).max(500)});
export const reviewInput=z.object({
  decision:z.enum(["approve","more_info","reject"]), note:optionalText(2000),
}).superRefine((v,ctx)=>{if(!v.note || v.note.trim().length<5)ctx.addIssue({code:"custom",path:["note"],message:"A useful explanation is required."});});
export const commodityInput=z.object({name:z.string().trim().min(2).max(100)});
