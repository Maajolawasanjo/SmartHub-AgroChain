import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,errorReply,reply} from "@/server/auth/http";
import {markNotificationRead} from "@/server/communications/inbox";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{assertSameOrigin(request);const {id}=await params;const payload=await readJson(request);
 const read=payload&&typeof payload==="object"&&"read" in payload?(payload as {read:unknown}).read:true;
 if(typeof read!=="boolean")return reply({error:"Invalid read state."},400);
 return reply({ok:true,...await markNotificationRead(id,read)});}catch(error){return errorReply(error);}
}
