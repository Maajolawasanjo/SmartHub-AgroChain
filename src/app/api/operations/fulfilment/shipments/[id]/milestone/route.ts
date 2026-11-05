import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {recordDeliveryMilestone} from "@/server/fulfilment/operations";
export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(req);const {id}=await params;return reply({ok:true,...await recordDeliveryMilestone(id,await readJson(req))});}catch(e){return errorReply(e);}}
