import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {createRefundCase} from "@/server/payments/refunds";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{assertSameOrigin(request);return reply({ok:true,...await createRefundCase(await readJson(request))});}
 catch(error){return errorReply(error);}
}
