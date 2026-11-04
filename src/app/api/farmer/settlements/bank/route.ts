import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {saveFarmerPayoutAccount} from "@/server/settlements/banking";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  assertSameOrigin(request);
  const data=await saveFarmerPayoutAccount(await readJson(request));
  return reply({ok:true,...data},201);
 }catch(error){return errorReply(error);}
}
