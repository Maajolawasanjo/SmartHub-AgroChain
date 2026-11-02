import type { NextRequest } from "next/server";
import { z } from "zod";
import { assertAdminRecordId, requireAdminApi } from "@/server/admin/guard";
import { isStaffRole, STAFF_ROLES } from "@/server/admin/permissions";
import { PublicError,assertSameOrigin,errorReply,readJson,reply } from "@/server/auth/http";
import { verifyCurrentPassword } from "@/server/auth/reauth";

export const runtime="nodejs";
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(request);
    const {ctx,db}=await requireAdminApi("staff.manage");
    const {id:rawId}=await context.params;
    const id=assertAdminRecordId(rawId);
    if(id===ctx.account.id)throw new PublicError(409,"You cannot change your own staff role here.");
    const input=z.object({role:z.enum(STAFF_ROLES),currentPassword:z.string().min(1).max(256)}).parse(await readJson(request));
    await verifyCurrentPassword(ctx.user.email,input.currentPassword,ctx.user.id);
    const target=await db.account.findUnique({where:{id},select:{id:true,role:true,status:true}});
    if(!target||!isStaffRole(target.role))throw new PublicError(404,"Staff record not found.");
    if(target.status!=="ACTIVE")throw new PublicError(409,"Reinstate the staff account before changing its role.");
    if(target.role===input.role)throw new PublicError(409,"The staff member already has this role.");
    await db.$transaction(async tx=>{
      const changed=await tx.account.updateMany({where:{id,role:target.role,status:"ACTIVE"},data:{role:input.role}});
      if(changed.count!==1)throw new PublicError(409,"Staff details changed. Refresh and try again.");
      if(input.role!=="FIELD_AGENT")await tx.fieldAgentAssignment.updateMany({where:{fieldAgentId:id,active:true},data:{active:false}});
      await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_ROLE_CHANGED",subjectId:id,details:{previousRole:target.role,newRole:input.role}}});
    });
    return reply({ok:true,message:"Staff role updated.",next:`/admin/staff/${id}`});
  }catch(error){return errorReply(error);}
}
