import type {NextRequest} from "next/server";
import {requireFieldAgentApi} from "@/server/field-agent/guard";
import {updateFieldVisit,activeStates} from "@/server/field-agent/actions";
import {assertSameOrigin,errorReply,PublicError,readJson,reply} from "@/server/auth/http";
import {assertFieldRecordId} from "@/server/field-agent/validators";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    const {ctx,db}=await requireFieldAgentApi();
    const {id:rawId}=await context.params;const id=assertFieldRecordId(rawId);
    const states=await activeStates(ctx.account.id);
    const item=await db.fieldVisit.findFirst({where:{id,fieldAgentId:ctx.account.id,farm:{is:{state:{in:states}}},},include:{farmer:{select:{id:true,fullName:true,farmName:true}},farm:{select:{id:true,name:true,state:true,lga:true,community:true,locationNote:true}},evidence:{where:{status:{in:["READY","FAILED","UPLOADING","DELETING"]}},orderBy:{createdAt:"asc"},select:{id:true,originalName:true,contentType:true,sizeBytes:true,caption:true,status:true,createdAt:true,updatedAt:true}},events:{orderBy:{createdAt:"desc"},take:30,select:{eventType:true,status:true,note:true,createdAt:true,actor:{select:{fullName:true,role:true}}}}}});
    if(!item)throw new PublicError(404,"Field visit not found in your active assignment scope.");
    return reply({item});
  }catch(error){return errorReply(error);}
}
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(request);
    const {id:rawId}=await context.params;const id=assertFieldRecordId(rawId);
    const result=await updateFieldVisit(id,await readJson(request));
    return reply({ok:true,...result});
  }catch(error){return errorReply(error);}
}
