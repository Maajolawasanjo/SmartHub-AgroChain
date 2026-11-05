import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {reviewRefundCase} from "@/server/payments/refunds";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{assertSameOrigin(request);const {id}=await params;return reply({ok:true,...await reviewRefundCase(id,await readJson(request))});}
 catch(error){return errorReply(error);}
}
