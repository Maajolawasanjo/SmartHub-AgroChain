import type { NextRequest } from "next/server";
import { isStaffRole } from "@/server/admin/permissions";
import { assertAdminRecordId, requireAdminApi } from "@/server/admin/guard";
import { errorReply, PublicError, reply } from "@/server/auth/http";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(_request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    const {db}=await requireAdminApi("staff.manage");
    const {id:rawId}=await context.params;
    const id=assertAdminRecordId(rawId);
    const item=await db.account.findUnique({where:{id},select:{id:true,fullName:true,email:true,phone:true,role:true,status:true,createdAt:true,updatedAt:true,
      fieldAgentAssignments:{orderBy:{state:"asc"},select:{id:true,state:true,active:true,createdAt:true,updatedAt:true,assignedBy:{select:{fullName:true}}}}}});
    if(!item||!isStaffRole(item.role))throw new PublicError(404,"Staff record not found.");
    return reply({item});
  }catch(error){return errorReply(error);}
}
