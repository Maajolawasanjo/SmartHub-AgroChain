import "server-only";
import { PublicError } from "@/server/auth/http";
import { requireActor } from "./policies";
import { cropInput, cropUpdateInput, farmInput, supplyInput, supplyWithdrawalInput, reviewInput, commodityInput } from "./validators";
import { z } from "zod";

const dateOrNull=(value:string|undefined)=>value?new Date(`${value}T00:00:00.000Z`):null;

export async function createFarm(input:unknown){
  const {account,db}=await requireActor("FARMER");
  const value=farmInput.parse(input);
  const verification=await db.farmerVerification.findUnique({where:{farmerId:account.id}});
  if(verification && ["PENDING_REVIEW","VERIFIED"].includes(verification.status))
    throw new PublicError(409,"Your verification is already pending or approved. Ask Operations before adding another farm.");
  const farm=await db.farm.create({data:{farmerId:account.id,...value}});
  await db.auditEvent.create({data:{actorId:account.id,action:"FARM_CREATED",subjectId:farm.id}});
  return {id:farm.id};
}
export async function updateFarm(id:string,input:unknown){
  const {account,db}=await requireActor("FARMER");
  const value=farmInput.parse(input);
  const v=await db.farmerVerification.findUnique({where:{farmerId:account.id}});
  if(v && !(["DRAFT","MORE_INFO_REQUIRED","REJECTED"] as string[]).includes(v.status))
    throw new PublicError(409,"Farm changes are locked while verification is pending or approved. Contact Operations.");
  const changed=await db.farm.updateMany({where:{id,farmerId:account.id},data:value});
  if(changed.count!==1)throw new PublicError(404,"Farm not found.");
  await db.auditEvent.create({data:{actorId:account.id,action:"FARM_UPDATED",subjectId:id}});
  return {id};
}
export async function submitFarmerVerification(){
  const {account,db}=await requireActor("FARMER");
  if(!await db.farm.count({where:{farmerId:account.id}}))throw new PublicError(409,"Add your farm details before requesting verification.");
  const now=new Date();
  return db.$transaction(async tx=>{
    const existing=await tx.farmerVerification.findUnique({where:{farmerId:account.id}});
    if(existing){
      if(!(["DRAFT","MORE_INFO_REQUIRED","REJECTED"] as string[]).includes(existing.status))throw new PublicError(409,"This verification case cannot be resubmitted in its current status.");
      const updated=await tx.farmerVerification.updateMany({where:{id:existing.id,status:existing.status},data:{status:"PENDING_REVIEW",submittedAt:now,feedback:null,reviewedAt:null,reviewedById:null}});
      if(updated.count!==1)throw new PublicError(409,"Verification changed. Refresh and try again.");
      await tx.farmerVerificationEvent.create({data:{verificationId:existing.id,actorId:account.id,status:"PENDING_REVIEW"}});
      return {id:existing.id};
    }
    const v=await tx.farmerVerification.create({data:{farmerId:account.id,status:"PENDING_REVIEW",submittedAt:now}});
    await tx.farmerVerificationEvent.create({data:{verificationId:v.id,actorId:account.id,status:"PENDING_REVIEW"}});
    return {id:v.id};
  });
}
export async function createCrop(input:unknown){
  const {account,db}=await requireActor("FARMER");
  const value=cropInput.parse(input);
  if(!await db.farm.findFirst({where:{id:value.farmId,farmerId:account.id}}))throw new PublicError(404,"Farm not found.");
  if(!await db.commodity.findFirst({where:{id:value.commodityId,active:true}}))throw new PublicError(400,"Select an active supported commodity.");
  const crop=await db.farmerCrop.create({data:{farmerId:account.id,farmId:value.farmId,commodityId:value.commodityId,
    variety:value.variety||null,stage:value.stage,plantingDate:dateOrNull(value.plantingDate),expectedHarvestAt:dateOrNull(value.expectedHarvestAt),
    estimatedQuantity:value.estimatedQuantity||null,estimatedUnit:value.estimatedUnit||null,notes:value.notes||null}});
  await db.auditEvent.create({data:{actorId:account.id,action:"CROP_CREATED",subjectId:crop.id}});
  return {id:crop.id};
}
// Crop records are estimates/progress only. Editing one never creates or alters physical stock.
export async function updateCrop(id:string,input:unknown){
  const {account,db}=await requireActor("FARMER");
  z.string().uuid().parse(id);
  const value=cropUpdateInput.parse(input);
  return db.$transaction(async tx=>{
    const existing=await tx.farmerCrop.findFirst({where:{id,farmerId:account.id}});
    if(!existing)throw new PublicError(404,"Crop not found.");
    if(existing.updatedAt.getTime()!==new Date(value.updatedAt).getTime())
      throw new PublicError(409,"This crop was changed elsewhere. Reload before saving your edits.");
    // A crop with declared physical supply cannot be reset to an unharvested stage.
    if(existing.stage==="HARVESTED" && ["PLANNED","GROWING"].includes(value.stage) &&
      await tx.supplyDeclaration.count({where:{cropId:id,farmerId:account.id,status:{not:"WITHDRAWN"}}}))
      throw new PublicError(409,"This crop is linked to a supply declaration. Its harvested stage cannot be reversed.");
    const changed=await tx.farmerCrop.updateMany({where:{id,farmerId:account.id,updatedAt:existing.updatedAt},data:{
      variety:value.variety||null,stage:value.stage,plantingDate:dateOrNull(value.plantingDate),
      expectedHarvestAt:dateOrNull(value.expectedHarvestAt),estimatedQuantity:value.estimatedQuantity||null,
      estimatedUnit:value.estimatedUnit||null,notes:value.notes||null,
    }});
    if(changed.count!==1)throw new PublicError(409,"This crop changed while you were editing. Reload and try again.");
    await tx.auditEvent.create({data:{actorId:account.id,action:"CROP_UPDATED",subjectId:id}});
    return {id};
  });
}

async function validateSupplyLinks(db:Awaited<ReturnType<typeof requireActor>>["db"],farmerId:string,value:ReturnType<typeof supplyInput.parse>){
  const farm=await db.farm.findFirst({where:{id:value.farmId,farmerId}});
  if(!farm)throw new PublicError(404,"Farm not found.");
  const commodity=await db.commodity.findFirst({where:{id:value.commodityId,active:true}});
  if(!commodity)throw new PublicError(400,"Select an active supported commodity.");
  if(value.cropId){
    const crop=await db.farmerCrop.findFirst({where:{id:value.cropId,farmerId,farmId:farm.id,commodityId:commodity.id}});
    if(!crop)throw new PublicError(400,"The selected crop must belong to this farmer, farm and commodity.");
  }
}
export async function createSupply(input:unknown){
  const {account,db}=await requireActor("FARMER");
  const value=supplyInput.parse(input);
  await validateSupplyLinks(db,account.id,value);
  if(value.action==="submit"){
    const v=await db.farmerVerification.findUnique({where:{farmerId:account.id}});
    if(v?.status!=="VERIFIED")throw new PublicError(409,"Complete farmer verification before submitting supply for review. You can save a draft now.");
  }
  const supply=await db.$transaction(async tx=>{
    const s=await tx.supplyDeclaration.create({data:{farmerId:account.id,farmId:value.farmId,cropId:value.cropId||null,commodityId:value.commodityId,
      variety:value.variety||null,quantity:value.quantity,unit:value.unit,packaging:value.packaging||null,
      harvestDate:dateOrNull(value.harvestDate),reportedCondition:value.reportedCondition,
      storageNote:value.storageNote||null,notes:value.notes||null,status:value.action==="submit"?"PENDING_REVIEW":"DRAFT",
      submittedAt:value.action==="submit"?new Date():null}});
    await tx.supplyReviewEvent.create({data:{supplyId:s.id,actorId:account.id,status:s.status}});
    await tx.auditEvent.create({data:{actorId:account.id,action:"SUPPLY_CREATED",subjectId:s.id}});
    return s;
  });
  return {id:supply.id,status:supply.status};
}
export async function changeSupply(id:string,input:unknown){
  const {account,db}=await requireActor("FARMER");
  const value=supplyInput.parse(input);
  await validateSupplyLinks(db,account.id,value);
  if(value.action==="submit"){
    const v=await db.farmerVerification.findUnique({where:{farmerId:account.id}});
    if(v?.status!=="VERIFIED")throw new PublicError(409,"Your farmer verification must be approved before submitting supply for review.");
  }
  return db.$transaction(async tx=>{
    const existing=await tx.supplyDeclaration.findFirst({where:{id,farmerId:account.id}});
    if(!existing)throw new PublicError(404,"Supply record not found.");
    if(!(["DRAFT","MORE_INFO_REQUIRED","REJECTED"] as string[]).includes(existing.status))throw new PublicError(409,"This record is under review or approved. Contact Operations to change it.");
    const next=value.action==="submit"?"PENDING_REVIEW":"DRAFT";
    const changed=await tx.supplyDeclaration.updateMany({where:{id,farmerId:account.id,status:existing.status},data:{
      farmId:value.farmId,cropId:value.cropId||null,commodityId:value.commodityId,variety:value.variety||null,
      quantity:value.quantity,unit:value.unit,packaging:value.packaging||null,harvestDate:dateOrNull(value.harvestDate),
      reportedCondition:value.reportedCondition,storageNote:value.storageNote||null,notes:value.notes||null,
      status:next,submittedAt:next==="PENDING_REVIEW"?new Date():null,feedback:null,reviewedAt:null,reviewedById:null}});
    if(changed.count!==1)throw new PublicError(409,"Record changed. Refresh before editing.");
    await tx.supplyReviewEvent.create({data:{supplyId:id,actorId:account.id,status:next}});
    await tx.auditEvent.create({data:{actorId:account.id,action:"SUPPLY_UPDATED",subjectId:id}});
    return {id,status:next};
  });
}
// Withdrawal is permitted only before Operations approves supply or any commercial allocation.
// Approved supply requires a separate Operations-managed reversal policy, not farmer self-service.
export async function withdrawSupply(id:string,input:unknown){
  const {account,db}=await requireActor("FARMER");
  z.string().uuid().parse(id);
  const {reason}=supplyWithdrawalInput.parse(input);
  return db.$transaction(async tx=>{
    const current=await tx.supplyDeclaration.findFirst({where:{id,farmerId:account.id}});
    if(!current)throw new PublicError(404,"Supply record not found.");
    if(!(["DRAFT","PENDING_REVIEW"] as string[]).includes(current.status))
      throw new PublicError(409,"Only drafts or pending submissions can be withdrawn. Contact Operations about reviewed supply.");
    const changed=await tx.supplyDeclaration.updateMany({
      where:{id,farmerId:account.id,status:current.status},data:{status:"WITHDRAWN"}
    });
    if(changed.count!==1)throw new PublicError(409,"Supply status changed. Reload before trying again.");
    await tx.supplyReviewEvent.create({data:{supplyId:id,actorId:account.id,status:"WITHDRAWN",note:reason}});
    await tx.auditEvent.create({data:{actorId:account.id,action:"SUPPLY_WITHDRAWN",subjectId:id}});
    return {id,status:"WITHDRAWN"};
  });
}

export async function reviewFarmer(id:string,input:unknown){
  const {account,db}=await requireActor("OPERATIONS");
  const value=reviewInput.parse(input);
  const status=value.decision==="approve"?"VERIFIED":value.decision==="reject"?"REJECTED":"MORE_INFO_REQUIRED";
  return db.$transaction(async tx=>{
    const candidate=await tx.farmerVerification.findUnique({where:{id}});
    if(!candidate)throw new PublicError(404,"Verification case not found.");
    if(candidate.status!=="PENDING_REVIEW")throw new PublicError(409,"Only pending verification can be reviewed.");
    if(candidate.farmerId===account.id)throw new PublicError(403,"You cannot review your own verification.");
    const updated=await tx.farmerVerification.updateMany({where:{id,status:"PENDING_REVIEW"},data:{status,feedback:value.note||null,reviewedById:account.id,reviewedAt:new Date()}});
    if(updated.count!==1)throw new PublicError(409,"Already reviewed. Refresh the queue.");
    await tx.farmerVerificationEvent.create({data:{verificationId:id,actorId:account.id,status,note:value.note||null}});
    return {id,status};
  });
}
export async function reviewSupply(id:string,input:unknown){
  const {account,db}=await requireActor("OPERATIONS");
  const value=reviewInput.parse(input);
  const status=value.decision==="approve"?"APPROVED":value.decision==="reject"?"REJECTED":"MORE_INFO_REQUIRED";
  return db.$transaction(async tx=>{
    const s=await tx.supplyDeclaration.findUnique({where:{id}});
    if(!s)throw new PublicError(404,"Supply not found.");
    if(s.status!=="PENDING_REVIEW")throw new PublicError(409,"Only pending supply can be reviewed.");
    if(s.farmerId===account.id)throw new PublicError(403,"You cannot review your own supply.");
    const verified=await tx.farmerVerification.findUnique({where:{farmerId:s.farmerId}});
    if(status==="APPROVED"&&verified?.status!=="VERIFIED")throw new PublicError(409,"Farmer verification must remain approved before supply approval.");
    const changed=await tx.supplyDeclaration.updateMany({where:{id,status:"PENDING_REVIEW"},data:{status,reviewedById:account.id,reviewedAt:new Date(),feedback:value.note||null}});
    if(changed.count!==1)throw new PublicError(409,"Already reviewed. Refresh the queue.");
    await tx.supplyReviewEvent.create({data:{supplyId:id,actorId:account.id,status,note:value.note||null}});
    return {id,status};
  });
}
export async function createCommodity(input:unknown){
  const {account,db}=await requireActor("OPERATIONS");
  const value=commodityInput.parse(input);
  const existing=await db.commodity.findFirst({where:{name:{equals:value.name,mode:"insensitive"}}});
  if(existing)throw new PublicError(409,"A commodity with this name already exists.");
  const c=await db.commodity.create({data:{name:value.name}});
  await db.auditEvent.create({data:{actorId:account.id,action:"COMMODITY_CREATED",subjectId:c.id}});
  return {id:c.id};
}
