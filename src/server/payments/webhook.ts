import "server-only";
import {z} from "zod";
import {PublicError} from "@/server/auth/http";
import {getPrisma} from "@/server/db/prisma";
import {hashPayload,verifyWebhookSignature} from "./paystack";
import {reconcileReference} from "./reconciliation";
import {reconcileSupplierTransfer} from "@/server/settlements/reconciliation";

const envelope=z.object({event:z.string().min(1).max(100),
 data:z.unknown()}).passthrough();
export async function receivePaystackWebhook(raw:Buffer,headers:Headers){
 if(raw.length<2||raw.length>262144)throw new PublicError(413,"Invalid webhook payload size.");
 const signatureMode=verifyWebhookSignature(raw,headers);
 if(!signatureMode)throw new PublicError(401,"Invalid payment provider signature.");
 let parsed:unknown;
 try{parsed=JSON.parse(raw.toString("utf8"));}catch{throw new PublicError(400,"Invalid provider event.");}
 const result=envelope.safeParse(parsed);
 if(!result.success)throw new PublicError(400,"Invalid provider event.");
 const event=result.data.event;
 const data=result.data.data&&typeof result.data.data==="object"&&!Array.isArray(result.data.data)?
  result.data.data as Record<string,unknown>:null;
 const reference=typeof data?.reference==="string"?data.reference:"";
 const db=getPrisma(),payloadHash=hashPayload(raw);
 const known=reference?await db.paymentAttempt.findUnique({where:{reference},select:{id:true}}):null;
 const row=await db.paymentProviderEvent.upsert({where:{payloadHash},create:{
  payloadHash,eventName:event,reference:reference.slice(0,60)||null,signatureMode,attemptId:known?.id??null
 },update:{},select:{id:true,status:true}});
 if(row.status==="VERIFIED"||row.status==="IGNORED"||row.status==="REVIEW_REQUIRED")
  return {ok:true,duplicate:true};
 if(["transfer.success","transfer.failed","transfer.reversed"].includes(event)){
  const attempt=/^stl_[0-9a-f]{32}$/.test(reference)?
    await db.supplierSettlementAttempt.findUnique({where:{reference},select:{id:true}}):null;
  if(!attempt){
   await db.paymentProviderEvent.update({where:{id:row.id},data:{status:"REVIEW_REQUIRED",processedAt:new Date()}});
   return {ok:true,reviewRequired:true};
  }
  // The signed provider event is only a notification; verify transfer independently.
  const check=await reconcileSupplierTransfer(reference,"WEBHOOK");
  const outcome=check.status==="SETTLED"?"VERIFIED":check.status==="REVIEW_REQUIRED"?"REVIEW_REQUIRED":"RECEIVED";
  await db.paymentProviderEvent.update({where:{id:row.id},data:{status:outcome,processedAt:new Date()}});
  return {ok:true,processed:outcome};
 }
 if(event!=="charge.success"){
  await db.paymentProviderEvent.update({where:{id:row.id},data:{status:"IGNORED",processedAt:new Date()}});
  return {ok:true,ignored:true};
 }
 if(!known||!/^SMH-[0-9A-F]{32}$/.test(reference)){
  await db.paymentProviderEvent.update({where:{id:row.id},data:{status:"REVIEW_REQUIRED",processedAt:new Date()}});
  return {ok:true,reviewRequired:true};
 }
 // Only a server-owned Verify Transaction API response may ever mark an order paid.
 // On provider/network errors this endpoint intentionally fails so Paystack retries.
 const reconciliation=await reconcileReference(reference,"WEBHOOK");
 const final=reconciliation.status==="VERIFIED"?"VERIFIED":reconciliation.status==="REVIEW_REQUIRED"?"REVIEW_REQUIRED":"RECEIVED";
 await db.paymentProviderEvent.update({where:{id:row.id},data:{status:final,processedAt:new Date()}});
 return {ok:true,processed:final};
}
