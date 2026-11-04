import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {createSupplierObligation} from "@/server/settlements/agreements";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  assertSameOrigin(request);const {id}=await params;
  const data=await createSupplierObligation(id);
  return reply({ok:true,...data});
 }catch(error){return errorReply(error);}
}
