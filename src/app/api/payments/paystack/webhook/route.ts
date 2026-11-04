import type {NextRequest} from "next/server";
import {reply,errorReply,PublicError} from "@/server/auth/http";
import {receivePaystackWebhook} from "@/server/payments/webhook";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  if(request.headers.get("content-length")&&Number(request.headers.get("content-length"))>262144)
   throw new PublicError(413,"Webhook payload too large.");
  const raw=Buffer.from(await request.arrayBuffer());
  return reply(await receivePaystackWebhook(raw,request.headers));
 }catch(error){return errorReply(error);}
}
