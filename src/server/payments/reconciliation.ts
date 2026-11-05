import "server-only";
import {PublicError} from "@/server/auth/http";
import type {Prisma,OrderStatus} from "@/generated/prisma/client";
import {getPrisma} from "@/server/db/prisma";
import {publishInboxEvent} from "@/server/communications/inbox";
import {verifyProvider,paidAmountMinor,providerDomainValid,providerTransactionId} from "./paystack";
import {atomic,lockOrder,conflict,audit,buyerOwner,financeActor,ensureFinanceScope} from "./common";
import {uuid} from "./validation";
type Trigger="WEBHOOK"|"BUYER"|"OPERATIONS";
async function freezeVerifiedOrder(tx:Prisma.TransactionClient,order:{id:string;status:OrderStatus},payerId:string,reason:string){
 if(!["PAYMENT_VERIFIED","FULFILLING","COMPLETED","DELIVERY_REVIEW"].includes(order.status))return;
 const changed=await tx.order.updateMany({where:{id:order.id,status:order.status},data:{status:"PAYMENT_REVIEW",version:{increment:1}}});
 if(changed.count!==1)conflict("The order changed during financial exception review.");
 await tx.orderStatusEvent.create({data:{orderId:order.id,actorId:payerId,status:"PAYMENT_REVIEW",
  note:"Server-originated provider reconciliation exception: "+reason.slice(0,1600)}});
}


export async function reconcileReference(reference:string,trigger:Trigger,actorId:string|null=null){
 if(!/^SMH-[0-9A-F]{32}$/.test(reference))throw new PublicError(400,"Invalid payment reference.");
 const db=getPrisma();
 const known=await db.paymentAttempt.findUnique({where:{reference},include:{obligation:{select:{orderId:true}}}});
 if(!known)throw new PublicError(404,"Payment reference was not found.");
 // Provider result is fetched server-to-server. A webhook body or browser callback is never trusted as proof.
 const verified=await verifyProvider(reference);
 const amount=paidAmountMinor(verified);
 const transactionId=providerTransactionId(verified);
 return atomic(db,async tx=>{
  const order=await lockOrder(tx,known.obligation.orderId);
  const attempt=await tx.paymentAttempt.findUnique({where:{reference},include:{obligation:true}});
  if(!attempt||attempt.obligation.orderId!==order.id)conflict("Payment reference has changed.");
  const obligation=attempt.obligation;
  const repeatVerified=obligation.status==="PAID"&&attempt.status==="VERIFIED"&&["PAYMENT_VERIFIED","FULFILLING","COMPLETED","DELIVERY_REVIEW"].includes(order.status);
  const base={attemptId:attempt.id,actorId,trigger,providerStatus:verified.status.slice(0,40),
   providerTransactionId:transactionId,amountMinor:amount,currency:verified.currency.slice(0,3)};
  const store=async(outcome:"VERIFIED"|"PENDING"|"FAILED"|"MISMATCH"|"LATE_PAYMENT",note:string)=>{
   await tx.paymentReconciliation.create({data:{...base,outcome,note}});
   await tx.paymentAttempt.update({where:{id:attempt.id},data:{lastCheckedAt:new Date()}});
  };
  if(verified.status!=="success"&&repeatVerified){
   await store("MISMATCH","Previously verified charge no longer has a successful provider status. Financial investigation required.");
   await tx.paymentObligation.update({where:{id:obligation.id},data:{status:"REVIEW_REQUIRED"}});
   await freezeVerifiedOrder(tx,order,attempt.payerId,"Previously verified charge changed its provider status.");
   return {status:"REVIEW_REQUIRED" as const,orderId:order.id,attemptId:attempt.id};
  }
  if(verified.status!=="success"){
   const failed=["failed","abandoned","reversed"].includes(verified.status);
   await store(failed?"FAILED":"PENDING",failed?"Provider reports a terminal unsuccessful attempt.":"Provider has not confirmed successful payment.");
   if(failed&&["INITIATING","READY","UNKNOWN"].includes(attempt.status))
    await tx.paymentAttempt.update({where:{id:attempt.id},data:{status:"FAILED"}});
   return {status:failed?"FAILED" as const:"PENDING" as const,orderId:order.id,attemptId:attempt.id};
  }
  const duplicate=transactionId?await tx.paymentAttempt.findFirst({where:{providerTransactionId:transactionId,id:{not:attempt.id}},select:{id:true}}):null;
  const invalid=verified.reference!==reference||!transactionId||!!duplicate||!amount||
   amount!==obligation.amountMinor||verified.currency!=="NGN"||obligation.currency!=="NGN"||
   verified.customer.email.toLowerCase()!==attempt.payerEmail.toLowerCase()||!providerDomainValid(verified)||
   (obligation.status==="PAID"&&attempt.status!=="VERIFIED");
  if(repeatVerified&&!invalid)
   return {status:"VERIFIED" as const,orderId:order.id,attemptId:attempt.id,unchanged:true};
  if(invalid){
   await store("MISMATCH","Provider success could not be matched to a unique reference, amount, payer email, currency, environment, or transaction ID.");
   await tx.paymentObligation.update({where:{id:obligation.id},data:{status:"REVIEW_REQUIRED"}});
   if(attempt.status!=="VERIFIED")await tx.paymentAttempt.update({where:{id:attempt.id},data:{status:"UNKNOWN"}});
   await freezeVerifiedOrder(tx,order,attempt.payerId,"Provider amount, payer identity, reference or transaction ID failed independent verification.");
   return {status:"REVIEW_REQUIRED" as const,orderId:order.id,attemptId:attempt.id};
  }
  const reservationsCurrent=order.lines.length>0&&order.lines.every(l=>l.reservation?.status==="ACTIVE"&&l.reservation.expiresAt.getTime()>Date.now());
  const late=order.status!=="PENDING_PAYMENT"||order.holdExpiresAt.getTime()<=Date.now()||!reservationsCurrent||obligation.status==="REVIEW_REQUIRED";
  if(late){
   await store("LATE_PAYMENT","Provider reports a genuine payment, but the active hold, order state or earlier review is no longer eligible. Financial resolution required.");
   await tx.paymentObligation.update({where:{id:obligation.id},data:{status:"REVIEW_REQUIRED"}});
   // Preserve a previously VERIFIED attempt as financial evidence. A late/reversed
   // order moves into financial review, but its historic verified charge must not
   // be misrepresented as an unknown/unverified payment attempt.
   if(attempt.status!=="VERIFIED")
    await tx.paymentAttempt.update({where:{id:attempt.id},data:{status:"UNKNOWN"}});
   await freezeVerifiedOrder(tx,order,attempt.payerId,"Payment is late or order/reservation no longer supports automatic credit.");
   return {status:"REVIEW_REQUIRED" as const,orderId:order.id,attemptId:attempt.id};
  }
  const changed=await tx.order.updateMany({where:{id:order.id,status:"PENDING_PAYMENT",version:order.version},
   data:{status:"PAYMENT_VERIFIED",version:{increment:1}}});
  if(changed.count!==1)conflict("Payment and order changed simultaneously. Repeat provider reconciliation.");
  await tx.paymentAttempt.update({where:{id:attempt.id},data:{status:"VERIFIED",providerTransactionId:transactionId,verifiedAt:new Date(),lastCheckedAt:new Date()}});
  await tx.paymentObligation.update({where:{id:obligation.id},data:{status:"PAID",verifiedAt:new Date()}});
  await store("VERIFIED","Direct Paystack verification matched unique transaction ID, exact NGN minor units, currency, payer, environment and live reservation.");
  // The actor field names the authenticated payer who INITIATED the payment. The processor was the server-side provider verification.
  await tx.orderStatusEvent.create({data:{orderId:order.id,actorId:attempt.payerId,status:"PAYMENT_VERIFIED",
   note:"Automated server-to-server Paystack verification. Event actor is the original payer, not the person/process that verified the charge."}});
  await audit(tx,attempt.payerId,order.id,"PAYSTACK_PAYMENT_VERIFIED",{verifiedBy:"PAYSTACK_VERIFY_API",trigger,reference,providerTransactionId:transactionId});
  const owners=await tx.buyerMembership.findMany({where:{organizationId:order.organizationId,role:"OWNER"},select:{accountId:true}});
  await publishInboxEvent(tx,{eventKey:"buyer-payment:verified:"+attempt.id,eventType:"BUYER_PAYMENT_VERIFIED",actorId:attempt.payerId,subjectId:order.id,
   recipients:owners.map(owner=>({accountId:owner.accountId,category:"FINANCE",title:"Payment verified",
    body:order.reference+" has an independently verified Paystack payment.",actionPath:"/dashboard/payments/"+obligation.id}))});
  return {status:"VERIFIED" as const,orderId:order.id,attemptId:attempt.id};
 });
}

export async function buyerVerifyAttempt(id:string){
 uuid.parse(id);const {account,member,db}=await buyerOwner();
 const attempt=await db.paymentAttempt.findFirst({where:{id,payerId:account.id,obligation:{organizationId:member.organizationId}},select:{reference:true}});
 if(!attempt)throw new PublicError(404,"Payment attempt not found.");
 return reconcileReference(attempt.reference,"BUYER",account.id);
}
export async function operationsVerifyAttempt(id:string){
 uuid.parse(id);const {account,db}=await financeActor();
 const attempt=await db.paymentAttempt.findUnique({where:{id},include:{obligation:{select:{orderId:true}}}});
 if(!attempt)throw new PublicError(404,"Payment attempt not found.");
 await atomic(db,async tx=>ensureFinanceScope(tx,attempt.obligation.orderId,account));
 return reconcileReference(attempt.reference,"OPERATIONS",account.id);
}
