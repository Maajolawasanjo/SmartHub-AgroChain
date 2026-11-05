import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {proposeFarmerAgreement} from "@/server/settlements/agreements";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  assertSameOrigin(request);
  const data=await proposeFarmerAgreement(await readJson(request));
  return reply({ok:true,...data},201);
 }catch(error){return errorReply(error);}
}
