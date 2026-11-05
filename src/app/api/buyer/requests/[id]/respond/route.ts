import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {respondToClarification} from "@/server/requests/service";
export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(req);const {id}=await params;return reply({ok:true,...await respondToClarification(id,await readJson(req,24000))});}catch(e){return errorReply(e);}}
