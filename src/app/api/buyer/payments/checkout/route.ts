import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {initializeCheckout} from "@/server/payments/checkout";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{assertSameOrigin(request);return reply({ok:true,...await initializeCheckout(await readJson(request))});}
 catch(error){return errorReply(error);}
}
