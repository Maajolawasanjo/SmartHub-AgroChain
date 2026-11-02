import type { NextRequest } from "next/server";
import { z } from "zod";
import { assertAdminRecordId, requireAdminApi } from "@/server/admin/guard";
import { PublicError,assertSameOrigin,errorReply,readJson,reply } from "@/server/auth/http";
import { verifyCurrentPassword } from "@/server/auth/reauth";

export const runtime="nodejs";
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(request);
    const {ctx,db}=await requireAdminApi("staff.invite");
    const {id:rawId}=await context.params;
    const id=assertAdminRecordId(rawId);
    const input=z.object({reason:z.string().trim().min(8).max(500),currentPassword:z.string().min(1).max(256)}).parse(await readJson(request));
    await verifyCurrentPassword(ctx.user.email,input.currentPassword,ctx.user.id);
    const invitation=await db.staffInvitation.findUnique({where:{id},select:{id:true,status:true,expiresAt:true,email:true}});
    if(!invitation)throw new PublicError(404,"Invitation not found.");
    if(invitation.status!=="PENDING"||invitation.expiresAt<=new Date())throw new PublicError(409,"Only a pending, unexpired invitation can be revoked.");
    await db.$transaction(async tx=>{
      const changed=await tx.staffInvitation.updateMany({where:{id,status:"PENDING",expiresAt:{gt:new Date()}},data:{status:"REVOKED"}});
      if(changed.count!==1)throw new PublicError(409,"Invitation status changed. Refresh and try again.");
      await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_INVITATION_REVOKED",subjectId:id,details:{reason:input.reason,email:invitation.email}}});
    });
    return reply({ok:true,message:"Invitation revoked. Its acceptance endpoint will no longer provision access."});
  }catch(error){return errorReply(error);}
}
