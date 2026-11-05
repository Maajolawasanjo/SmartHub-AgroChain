import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {operationsReconcileTransfer} from "@/server/settlements/reconciliation";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  assertSameOrigin(request);const {id}=await params;
  const data=await operationsReconcileTransfer(id);
  return reply({ok:true,...data});
 }catch(error){return errorReply(error);}
}
