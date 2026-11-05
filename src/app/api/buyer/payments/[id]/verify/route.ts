import type {NextRequest} from "next/server";
import {assertSameOrigin,reply,errorReply} from "@/server/auth/http";
import {buyerVerifyAttempt} from "@/server/payments/reconciliation";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{assertSameOrigin(request);const {id}=await params;return reply({ok:true,...await buyerVerifyAttempt(id)});}
 catch(error){return errorReply(error);}
}
