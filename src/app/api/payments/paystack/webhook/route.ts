import type {NextRequest} from "next/server";
import {reply,errorReply,PublicError} from "@/server/auth/http";
import {receivePaystackWebhook} from "@/server/payments/webhook";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  if(request.headers.get("content-length")&&Number(request.headers.get("content-length"))>262144)
   throw new PublicError(413,"Webhook payload too large.");
  // Cap bytes *as they arrive*; never allocate an unbounded request body before signature validation.
  if(!request.body)throw new PublicError(400,"Webhook body is required.");
  const reader=request.body.getReader();
  const chunks:Buffer[]=[];let size=0;
  try{
   while(true){
    const {value,done}=await reader.read();
    if(done)break;
    size+=value.byteLength;
    if(size>262144){await reader.cancel();throw new PublicError(413,"Webhook payload too large.");}
    chunks.push(Buffer.from(value));
   }
  }finally{reader.releaseLock();}
  return reply(await receivePaystackWebhook(Buffer.concat(chunks,size),request.headers));
 }catch(error){return errorReply(error);}
}
