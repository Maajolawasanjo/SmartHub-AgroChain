import type {NextRequest} from "next/server";
import {z} from "zod";
import {requireActor} from "@/server/agriculture/policies";
import {assertSameOrigin,readJson,reply,errorReply,PublicError} from "@/server/auth/http";
export const runtime="nodejs";
const change=z.object({status:z.enum(["NEW","IN_REVIEW","CLOSED"]),expectedStatus:z.enum(["NEW","IN_REVIEW","CLOSED"])});
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  assertSameOrigin(request);const {account,db}=await requireActor("OPERATIONS");
  const {id}=await params;const values=change.parse(await readJson(request));
  if(!z.uuid().safeParse(id).success)throw new PublicError(404,"Enquiry not found.");
  if(values.status===values.expectedStatus)throw new PublicError(400,"Choose a different status.");
  await db.$transaction(async tx=>{
   const changed=await tx.publicEnquiry.updateMany({where:{id,status:values.expectedStatus},data:{status:values.status}});
   if(changed.count!==1)throw new PublicError(409,"Enquiry was already updated. Refresh and try again.");
   await tx.auditEvent.create({data:{actorId:account.id,action:`ENQUIRY_${values.status}`,subjectId:id}});
  });
  return reply({ok:true,message:"Enquiry status updated."});
 }catch(err){return errorReply(err);}
}
