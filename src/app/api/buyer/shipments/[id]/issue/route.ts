import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {raiseDeliveryIssue} from "@/server/fulfilment/receipts";
export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(req);const {id}=await params;return reply({ok:true,...await raiseDeliveryIssue(id,await readJson(req))});}catch(e){return errorReply(e);}}
