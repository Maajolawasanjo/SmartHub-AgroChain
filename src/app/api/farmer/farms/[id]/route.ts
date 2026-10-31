import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {updateFarm} from "@/server/agriculture/actions";
export const runtime="nodejs";
export async function PATCH(req:NextRequest,ctx:{params:Promise<{id:string}>}){
 try {assertSameOrigin(req);const {id}=await ctx.params;const result=await updateFarm(id,await readJson(req));return reply({ok:true,...result,next:"/farmer/kyc"});}catch(e){return errorReply(e);}
}
