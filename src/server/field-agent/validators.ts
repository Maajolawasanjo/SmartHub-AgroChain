import { z } from "zod";
import { PublicError } from "@/server/auth/http";

const id=z.string().uuid();
const optionalText=(max:number)=>z.string().trim().max(max).optional().or(z.literal(""));
const date=z.iso.date();
export const fieldVisitPurpose=z.enum(["FARMER_VERIFICATION","FARM_ASSESSMENT","CROP_ASSESSMENT","PRODUCTION_OBSERVATION"]);
export const fieldVisitCreateInput=z.object({farmId:id,purpose:fieldVisitPurpose,visitDate:date});
export const fieldVisitUpdateInput=z.object({
  farmerPresent:z.enum(["yes","no","unknown"]).optional(),
  cropObservations:optionalText(3000),
  productionObservations:optionalText(3000),
  fieldNotes:optionalText(5000),
  followUpRequired:z.boolean().optional(),
  followUpNotes:optionalText(2000),
}).superRefine((value,ctx)=>{
  if(value.followUpRequired===true&&(!value.followUpNotes||value.followUpNotes.trim().length<5))
    ctx.addIssue({code:"custom",path:["followUpNotes"],message:"Describe the follow-up needed."});
});
export const fieldVisitSubmitInput=z.object({confirmation:z.literal(true)});
export const fieldVisitCancelInput=z.object({reason:z.string().trim().min(8).max(500)});
export const fieldVisitReviewInput=z.object({decision:z.enum(["accept","return"]),note:z.string().trim().min(8).max(2000)});
export const fieldVisitEvidenceInput=z.object({caption:optionalText(500)});
export function assertFieldRecordId(value:string){
  if(!z.string().uuid().safeParse(value).success)throw new PublicError(404,"Record not found.");
  return value;
}
