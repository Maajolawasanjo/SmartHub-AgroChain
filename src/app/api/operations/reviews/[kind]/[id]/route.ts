import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply,PublicError} from "@/server/auth/http";
import {reviewFarmer,reviewSupply} from "@/server/agriculture/actions";
export const runtime="nodejs";
export async function POST(req:NextRequest,ctx:{params:Promise<{kind:string;id:string}>}){
 try{assertSameOrigin(req);const {kind,id}=await ctx.params;
 if(!["verification","supply"].includes(kind))throw new PublicError(404,"Unknown review type.");
 const values=await readJson(req);
 const result=kind==="verification"?await reviewFarmer(id,values):await reviewSupply(id,values);
 return reply({ok:true,...result,next:kind==="verification"?"/operations/verification":"/operations/supply"});
 }catch(e){return errorReply(e);}
}
