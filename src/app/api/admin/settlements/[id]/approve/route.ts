import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {approveSupplierObligation} from "@/server/settlements/approval";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  assertSameOrigin(request);const {id}=await params;
  const data=await approveSupplierObligation(id,await readJson(request));
  return reply({ok:true,...data},201);
 }catch(error){return errorReply(error);}
}
