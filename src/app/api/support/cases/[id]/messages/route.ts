import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {replySupportCase} from "@/server/communications/support";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{assertSameOrigin(request);const {id}=await params;return reply({ok:true,...await replySupportCase(id,await readJson(request))},201);}
 catch(error){return errorReply(error);}
}
