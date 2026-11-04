import "server-only";
import {lotCreate,lotHold,orderId} from "./validation";
import {transact,requireOperator,lockActor,inspectionEligibility,audit,conflict,lockLot} from "./common";

export async function registerPhysicalLot(input:unknown){
 const value=lotCreate.parse(input);const {account,db}=await requireOperator();
 return transact(db,async tx=>{
  await lockActor(tx,account.id);
  const {supply,inspection,eligible}=await inspectionEligibility(tx,value.supplyId);
  const existing=await tx.supplyLot.findUnique({where:{supplyId:supply.id}});
  if(existing){
   if(existing.inspectionId!==inspection.id||existing.quantity.gt(eligible))
    conflict("The inspection supporting this lot changed. Reconciliation is required before further orders.");
   return {id:existing.id,status:existing.status,quantity:existing.quantity.toString(),existing:true};
  }
  const lot=await tx.supplyLot.create({data:{supplyId:supply.id,inspectionId:inspection.id,createdById:account.id,
   quantity:eligible,unit:supply.unit,locationNote:value.locationNote}});
  await tx.stockMovement.create({data:{lotId:lot.id,actorId:account.id,kind:"RECEIVED",quantity:eligible,
   note:"Verified physical supply register; this is not a warehouse transfer or change of ownership."}});
  await audit(tx,account.id,lot.id,"PHYSICAL_SOURCE_LOT_REGISTERED",{supplyId:supply.id,inspectionId:inspection.id,quantity:eligible.toString()});
  return {id:lot.id,status:lot.status,quantity:eligible.toString(),existing:false};
 });
}

export async function holdPhysicalLot(id:string,input:unknown){
 orderId.parse(id);
 const value=lotHold.parse(input);
 const {account,db}=await requireOperator();
 return transact(db,async tx=>{
  await lockActor(tx,account.id);
  const candidate=await tx.supplyLot.findUnique({where:{id},select:{supplyId:true}});
  if(!candidate)throw new Error("Physical sourced lot was not found.");
  const eligibility=value.status==="AVAILABLE"?await inspectionEligibility(tx,candidate.supplyId):null;
  const lot=await lockLot(tx,id);
  if(lot.status===value.status)return {id,status:lot.status};
  if(eligibility&&(eligibility.inspection.id!==lot.inspectionId||eligibility.eligible.lt(lot.quantity)))
   conflict("Supply inspection changed. Resolve it before reopening this physical lot.");
  const updated=await tx.supplyLot.update({where:{id},data:{status:value.status}});
  await audit(tx,account.id,id,"PHYSICAL_LOT_STATUS_CHANGED",{from:lot.status,to:updated.status,reason:value.reason});
  return {id,status:updated.status};
 });
}
