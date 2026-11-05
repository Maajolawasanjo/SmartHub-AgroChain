import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {respondToOpportunity} from "@/server/commerce/service";
export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(req);const {id}=await params;return reply({ok:true,...await respondToOpportunity(id,await readJson(req))});}catch(e){return errorReply(e);}}
