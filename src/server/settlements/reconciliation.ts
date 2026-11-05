import "server-only";
import {PublicError} from "@/server/auth/http";
import {getPrisma} from "@/server/db/prisma";
import {id} from "./validation";
import {atomic,operationsActor,superAdminActor,reviewerScope,lockOrder,orderSafeForSupplierSettlement,conflict,audit} from "./common";
import {verifyTransfer,transferAmount,transferId,decryptNumber} from "./paystack-transfers";
import {secretKey} from "@/server/payments/paystack";

type Trigger="WEBHOOK"|"OPERATIONS"|"ADMIN";
export async function reconcileSupplierTransfer(reference:string,trigger:Trigger,actorId:string|null=null){
 if(!/^stl_[0-9a-f]{32}$/.test(reference))throw new PublicError(400,"Invalid supplier transfer reference.");
 const db=getPrisma();
 const initial=await db.supplierSettlementAttempt.findUnique({where:{reference},
  include:{obligation:{select:{orderLine:{select:{orderId:true}}}}}});
 if(!initial)throw new PublicError(404,"Supplier transfer not found.");
 // Provider status is looked up independently. No browser-supplied or signed event body is payment proof.
 const proof=await verifyTransfer(reference);
 const amount=transferAmount(proof.amount),providerId=transferId(proof.id);
 return atomic(db,async tx=>{
  const order=await lockOrder(tx,initial.obligation.orderLine.orderId);
  await tx.$queryRawUnsafe('SELECT "id" FROM "supplier_obligations" WHERE "id" = $1::uuid FOR UPDATE',initial.obligationId);
  const attempt=await tx.supplierSettlementAttempt.findUnique({where:{reference},
   include:{obligation:{include:{agreement:true,farmer:{include:{payoutAccount:true}}}}}});
  if(!attempt||attempt.obligationId!==initial.obligationId)
   conflict("The supplier transfer reference has changed.");
  const obligation=attempt.obligation;
  const duplicate=providerId?await tx.supplierSettlementAttempt.findFirst({where:{
   providerTransferId:providerId,id:{not:attempt.id}},select:{id:true}}):null;
  // Verify the immutable approved bank snapshot. The farmer may later change bank
  // without making an old, legitimately settled transfer fail reconciliation.
  const expected=secretKey().startsWith("sk_test_")?"test":"live";
  const destinationMatches=attempt.recipientFingerprint===obligation.bankFingerprint&&
   proof.recipient.recipient_code===attempt.recipientCode&&
   proof.recipient.currency==="NGN"&&proof.recipient.domain===expected&&
   proof.recipient.details.bank_code===attempt.recipientBankCode&&
   proof.recipient.details.account_number===decryptNumber(attempt.recipientEncryptedNumber);
  const mismatched=proof.reference!==reference||amount!==obligation.amountMinor||proof.currency!=="NGN"||
   proof.domain!==expected||!providerId||!!duplicate||!destinationMatches||
   (!!attempt.providerTransferId&&attempt.providerTransferId!==providerId);
  const attemptId=attempt.id;
  async function log(outcome:"VERIFIED"|"PENDING"|"FAILED"|"MISMATCH"|"LATE_REVIEW",message:string){
   await tx.supplierSettlementReconciliation.create({data:{attemptId,actorId,trigger,outcome,
    providerStatus:proof.status.slice(0,40),providerTransferId:providerId,
    amountMinor:amount,currency:proof.currency.slice(0,3),note:message.slice(0,1500)}});
   await tx.supplierSettlementAttempt.update({where:{id:attemptId},data:{lastCheckedAt:new Date()}});
  }
  if(mismatched){
   await log("MISMATCH","Provider transfer did not match unique reference, approved farmer bank, amount, currency, recipient or environment.");
   await tx.supplierSettlementAttempt.update({where:{id:attempt.id},data:{status:"REVIEW_REQUIRED"}});
   await tx.supplierObligation.update({where:{id:obligation.id},data:{status:"REVIEW_REQUIRED"}});
   await audit(tx,attempt.initiatedById,attempt.id,"SUPPLIER_TRANSFER_EXCEPTION",{trigger,kind:"MISMATCH"});
   return {status:"REVIEW_REQUIRED" as const,id:attempt.id};
  }
  if(proof.status!=="success"&&obligation.status==="SETTLED"&&attempt.status==="VERIFIED"){
   // A previously reconciled payout may later be reversed or disputed at the provider.
   // Never continue showing SETTLED if a fresh direct provider check says otherwise.
   await log("LATE_REVIEW","A previously settled farmer transfer no longer has successful provider status. Reconciliation and recovery required.");
   await tx.supplierSettlementAttempt.update({where:{id:attempt.id},data:{status:"REVIEW_REQUIRED"}});
   await tx.supplierObligation.update({where:{id:obligation.id},data:{status:"REVIEW_REQUIRED"}});
   await audit(tx,attempt.initiatedById,attempt.id,"SUPPLIER_SETTLED_TRANSFER_RECHECK_FAILED",{trigger,providerStatus:proof.status});
   return {status:"REVIEW_REQUIRED" as const,id:attempt.id};
  }
  if(proof.status==="success"){
   if(obligation.status==="SETTLED"&&attempt.status==="VERIFIED")
    return {status:"SETTLED" as const,id:attempt.id,unchanged:true};
   let eligible=true;
   try{orderSafeForSupplierSettlement(order);}catch{eligible=false;}
   if(!eligible||obligation.status!=="TRANSFER_PENDING"||obligation.agreement.status!=="ACCEPTED"){
    await log("LATE_REVIEW","Provider reports success, but the buyer order or supplier obligation is no longer eligible for automatic settlement.");
    await tx.supplierSettlementAttempt.update({where:{id:attempt.id},data:{status:"REVIEW_REQUIRED"}});
    await tx.supplierObligation.update({where:{id:obligation.id},data:{status:"REVIEW_REQUIRED"}});
    return {status:"REVIEW_REQUIRED" as const,id:attempt.id};
   }
   await tx.supplierSettlementAttempt.update({where:{id:attempt.id},data:{
    status:"VERIFIED",providerTransferId:providerId,verifiedAt:new Date()}});
   await tx.supplierObligation.update({where:{id:obligation.id},data:{status:"SETTLED"}});
   await log("VERIFIED","Direct Paystack transfer verification matched reference, unique transfer ID, exact amount, currency, environment and approved farmer bank.");
   await audit(tx,attempt.initiatedById,attempt.id,"SUPPLIER_TRANSFER_VERIFIED",{
    reference,providerTransferId:providerId,amountMinor:obligation.amountMinor.toString(),trigger
   });
   return {status:"SETTLED" as const,id:attempt.id};
  }
  if(["failed","reversed","abandoned"].includes(proof.status)){
   await log("FAILED","Provider reports failed or reversed transfer. A separate financial resolution and approval are required.");
   await tx.supplierSettlementAttempt.update({where:{id:attempt.id},data:{status:"FAILED"}});
   await tx.supplierObligation.update({where:{id:obligation.id},data:{status:"REVIEW_REQUIRED"}});
   return {status:"REVIEW_REQUIRED" as const,id:attempt.id};
  }
  await log("PENDING","The provider has not independently confirmed that the transfer is settled; OTP, queue and pending states are not paid.");
  if(attempt.status!=="VERIFIED")
   await tx.supplierSettlementAttempt.update({where:{id:attempt.id},data:{status:proof.status==="otp"?"UNKNOWN":"PENDING"}});
  return {status:"PENDING" as const,id:attempt.id};
 });
}

export async function operationsReconcileTransfer(attemptId:string){
 id.parse(attemptId);
 const {account,db}=await operationsActor();
 const attempt=await db.supplierSettlementAttempt.findUnique({where:{id:attemptId},
  include:{obligation:{select:{orderLine:{select:{orderId:true}}}}}});
 if(!attempt)throw new PublicError(404,"Settlement attempt not found.");
 await atomic(db,tx=>reviewerScope(tx,attempt.obligation.orderLine.orderId,account.id));
 return reconcileSupplierTransfer(attempt.reference,"OPERATIONS",account.id);
}
export async function adminReconcileTransfer(attemptId:string){
 id.parse(attemptId);
 const {account,db}=await superAdminActor();
 const attempt=await db.supplierSettlementAttempt.findUnique({where:{id:attemptId},select:{reference:true}});
 if(!attempt)throw new PublicError(404,"Settlement attempt not found.");
 return reconcileSupplierTransfer(attempt.reference,"ADMIN",account.id);
}
