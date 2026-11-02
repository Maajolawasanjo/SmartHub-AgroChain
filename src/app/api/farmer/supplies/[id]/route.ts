import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {changeSupply} from "@/server/agriculture/actions";
export const runtime="nodejs";
export async function PATCH(req:NextRequest,ctx:{params:Promise<{id:string}>}){
 try {assertSameOrigin(req);const {id}=await ctx.params;const result=await changeSupply(id,await readJson(req));return reply({ok:true,...result,next:"/farmer/my-supply/available"});}catch(e){return errorReply(e);}
}
