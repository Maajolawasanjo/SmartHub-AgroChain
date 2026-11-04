import "server-only";
import {randomUUID} from "node:crypto";
import {PublicError} from "@/server/auth/http";
import {checkoutCreate} from "./validation";
import {initializeProvider} from "./paystack";
import {atomic,buyerOwner,conflict,lockOrder,payable,audit} from "./common";

export async function initializeCheckout(input:unknown){
 const {orderId}=checkoutCreate.parse(input);
 const {account,member,db}=await buyerOwner();
 // Create the payment intent BEFORE the provider call; a lost provider response cannot silently create a second charge.
 const intent=await atomic(db,async tx=>{
  await tx.$queryRawUnsafe('SELECT "id" FROM "app_accounts" WHERE "id" = $1::uuid FOR UPDATE',account.id);
  const current=await tx.account.findUnique({where:{id:account.id},select:{role:true,status:true,email:true}});
  const currentMembership=await tx.buyerMembership.findUnique({where:{accountId:account.id}});
  if(current?.role!=="BUYER"||current.status!=="ACTIVE"||currentMembership?.organizationId!==member.organizationId||currentMembership.role!=="OWNER")
   throw new PublicError(403,"Your payment authorization has changed.");
  const order=await lockOrder(tx,orderId);
  if(order.organizationId!==member.organizationId)throw new PublicError(404,"Order not found.");
  const amountMinor=payable(order);
  const existing=await tx.paymentObligation.findUnique({where:{orderId}});
  if(existing&&(existing.organizationId!==member.organizationId||existing.amountMinor!==amountMinor||existing.currency!=="NGN"))
   conflict("An existing payment obligation does not match the order total. Request a review.");
  if(existing&&existing.status!=="UNPAID")
   conflict("This payment is already verified or requires review. Open its recorded status.");
  const obligation=existing??await tx.paymentObligation.create({data:{orderId,organizationId:order.organizationId,amountMinor,currency:"NGN"}});
  const active=await tx.paymentAttempt.findFirst({where:{obligationId:obligation.id,status:{in:["INITIATING","READY","UNKNOWN","VERIFIED"]}},orderBy:{createdAt:"desc"}});
  if(active){
   if(active.payerId!==account.id)conflict("A different authorized account started payment; contact Operations.");
   if(active.status==="READY"&&active.authorizationUrl)
    return {ready:true,id:active.id,authorizationUrl:active.authorizationUrl,reference:active.reference};
   conflict("A payment has already been initiated or is being verified. Check its reference before retrying.");
  }
  const id=randomUUID(),reference="SMH-"+id.replaceAll("-","").toUpperCase();
  const attempt=await tx.paymentAttempt.create({data:{id,obligationId:obligation.id,reference,payerId:account.id,payerEmail:current.email}});
  await audit(tx,account.id,attempt.id,"PAYMENT_INITIATION_RECORDED",{orderId,obligationId:obligation.id});
  return {ready:false,id:attempt.id,reference:attempt.reference,obligationId:obligation.id,email:attempt.payerEmail,amountMinor,orderId};
 });
 if(intent.ready)return {status:"READY",attemptId:intent.id,checkoutUrl:intent.authorizationUrl};
 let authorizationUrl:string;
 try{
  authorizationUrl=await initializeProvider({reference:intent.reference,email:intent.email,amountMinor:intent.amountMinor,orderId:intent.orderId,obligationId:intent.obligationId});
 }catch(error){
  await atomic(db,async tx=>{
   await tx.paymentAttempt.updateMany({where:{id:intent.id,status:"INITIATING"},data:{status:"UNKNOWN"}});
  });
  throw error;
 }
 const updated=await atomic(db,async tx=>{
  const changed=await tx.paymentAttempt.updateMany({where:{id:intent.id,status:"INITIATING"},data:{status:"READY",authorizationUrl}});
  if(changed.count===1)return "READY" as const;
  const current=await tx.paymentAttempt.findUnique({where:{id:intent.id},select:{status:true}});
  return current?.status??"UNKNOWN";
 });
 if(updated!=="READY")return {status:updated,attemptId:intent.id,checkoutUrl:null};
 return {status:"READY",attemptId:intent.id,checkoutUrl:authorizationUrl};
}
