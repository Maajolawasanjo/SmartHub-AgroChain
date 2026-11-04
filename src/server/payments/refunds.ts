import "server-only";
import {PublicError} from "@/server/auth/http";
import {refundCreate,refundReview,uuid} from "./validation";
import {atomic,buyerOwner,financeActor,conflict,audit} from "./common";

export async function createRefundCase(input:unknown){
 const value=refundCreate.parse(input);
 const {account,member,db}=await buyerOwner();
 return atomic(db,async tx=>{
  const obligation=await tx.paymentObligation.findFirst({where:{id:value.obligationId,organizationId:member.organizationId},
   include:{order:{select:{status:true}}}});
  if(!obligation)throw new PublicError(404,"Payment record not found.");
  if(obligation.status!=="PAID"||obligation.order.status!=="PAYMENT_VERIFIED")
   conflict("Only independently verified payments can be submitted for an ordinary refund review. Contact support for unresolved or late payments.");
  const existing=await tx.refundRequest.findUnique({where:{obligationId_requestedById:{obligationId:obligation.id,requestedById:account.id}}});
  if(existing)return {id:existing.id,status:existing.status,existing:true};
  const record=await tx.refundRequest.create({data:{obligationId:obligation.id,requestedById:account.id,reason:value.reason}});
  await audit(tx,account.id,record.id,"REFUND_REVIEW_REQUESTED",{obligationId:obligation.id});
  return {id:record.id,status:record.status,existing:false};
 });
}

export async function reviewRefundCase(id:string,input:unknown){
 uuid.parse(id);const value=refundReview.parse(input);const {account,db}=await financeActor();
 if(account.role!=="SUPER_ADMIN")throw new PublicError(403,"Only Super Admin can decide refund review cases.");
 return atomic(db,async tx=>{
  const record=await tx.refundRequest.findUnique({where:{id}});
  if(!record)throw new PublicError(404,"Refund case not found.");
  if(!["REQUESTED","UNDER_REVIEW"].includes(record.status))
   conflict("This case has already moved to resolution or rejection.");
  if(record.status===value.action)conflict("The case is already in this review state.");
  // A review decision is NOT a Paystack refund. No provider refund API is called.
  const next=await tx.refundRequest.update({where:{id},data:{status:value.action,reviewNote:value.note,reviewedById:account.id}});
  await audit(tx,account.id,id,"REFUND_REVIEW_"+value.action,{obligationId:record.obligationId});
  return {id,status:next.status};
 });
}
