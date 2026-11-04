import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {withdrawSupply} from "@/server/agriculture/actions";
export const runtime="nodejs";
export async function POST(req:NextRequest,ctx:{params:Promise<{id:string}>}){
 try{assertSameOrigin(req);const {id}=await ctx.params;const result=await withdrawSupply(id,await readJson(req));return reply({ok:true,...result,next:`/farmer/my-supply/available/${id}`});}
 catch(e){return errorReply(e);}
}
