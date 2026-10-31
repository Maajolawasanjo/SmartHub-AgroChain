import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi,assertAdminRecordId } from "@/server/admin/guard";
import { isStaffRole } from "@/server/admin/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PublicError,assertSameOrigin,errorReply,readJson,reply } from "@/server/auth/http";
import { verifyCurrentPassword } from "@/server/auth/reauth";

export const runtime="nodejs";
const inputSchema=z.object({status:z.enum(["ACTIVE","SUSPENDED"]),reason:z.string().trim().min(8).max(500),currentPassword:z.string().min(1).max(256)});
type StatusResult={ok:boolean;message:string};

export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
  let externalAction:"BAN"|"UNBAN"|undefined;
  let targetId:string|undefined;
  try{
    assertSameOrigin(request);
    const {ctx,db}=await requireAdminApi("staff.manage");
    const {id:rawId}=await context.params;
    const id=assertAdminRecordId(rawId);targetId=id;
    if(id===ctx.account.id)throw new PublicError(409,"You cannot suspend or reinstate your own account here.");
    if(!process.env.SUPABASE_SECRET_KEY)throw new PublicError(503,"The authentication admin service is not configured.");
    const input=inputSchema.parse(await readJson(request));
    await verifyCurrentPassword(ctx.user.email,input.currentPassword,ctx.user.id);
    const admin=createSupabaseAdminClient();
    const result:StatusResult=await db.$transaction(async tx=>{
      // Serialize provider ban/unban and database status transitions for this account.
      await tx.$queryRaw`SELECT "id" FROM "app_accounts" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const target=await tx.account.findUnique({where:{id},select:{id:true,role:true,status:true}});
      if(!target||!isStaffRole(target.role))throw new PublicError(404,"Staff record not found.");
      if(target.status==="DISABLED")throw new PublicError(409,"This account is disabled and requires a separate recovery review.");
      if(target.status===input.status)throw new PublicError(409,"The staff account already has this status.");

      // Supabase bans do not invalidate already-issued access tokens; app requests must still check app_accounts.status.
      if(input.status==="ACTIVE"){
        let providerError=false;
        try{const response=await admin.auth.admin.updateUserById(id,{ban_duration:"none"});providerError=Boolean(response.error);}
        catch{providerError=true;}
        if(providerError){
          await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_REINSTATEMENT_AUTH_SYNC_FAILED",subjectId:id,details:{reason:input.reason,previousStatus:target.status,requestedStatus:input.status}}});
          return {ok:false,message:"Could not lift the authentication ban. The account remains suspended; retry after checking the Auth service."};
        }
        externalAction="UNBAN";
        const changed=await tx.account.updateMany({where:{id,status:target.status,role:target.role},data:{status:"ACTIVE"}});
        if(changed.count!==1)throw new PublicError(409,"Staff status changed. Refresh and try again.");
        await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_REINSTATED",subjectId:id,details:{reason:input.reason,previousStatus:target.status,newStatus:"ACTIVE"}}});
        await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_AUTH_BAN_SYNCED",subjectId:id,details:{banLifted:true}}});
        return {ok:true,message:"Staff account reinstated. Field scopes remain inactive until reassigned."};
      }

      const changed=await tx.account.updateMany({where:{id,status:target.status,role:target.role},data:{status:"SUSPENDED"}});
      if(changed.count!==1)throw new PublicError(409,"Staff status changed. Refresh and try again.");
      const assignments=await tx.fieldAgentAssignment.updateMany({where:{fieldAgentId:id,active:true},data:{active:false}});
      let providerError=false;
      try{const response=await admin.auth.admin.updateUserById(id,{ban_duration:"876000h"});providerError=Boolean(response.error);}
      catch{providerError=true;}
      if(providerError){
        await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_SUSPENDED_AUTH_SYNC_FAILED",subjectId:id,details:{reason:input.reason,previousStatus:target.status,newStatus:"SUSPENDED",deactivatedAssignments:assignments.count}}});
        return {ok:false,message:"The account is suspended in SmartHub, but the Auth sign-in block could not be synchronized. Existing application access is denied; retry provider sync."};
      }
      externalAction="BAN";
      await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_SUSPENDED",subjectId:id,details:{reason:input.reason,previousStatus:target.status,newStatus:"SUSPENDED",deactivatedAssignments:assignments.count}}});
      await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_AUTH_BAN_SYNCED",subjectId:id,details:{banApplied:true}}});
      return {ok:true,message:"Staff access suspended. Active field scopes were deactivated."};
    },{timeout:30000,maxWait:10000});
    if(!result.ok)throw new PublicError(503,result.message);
    return reply({ok:true,message:result.message,next:`/admin/staff/${id}`});
  }catch(error){
    // If the database transaction failed after the provider action, try to restore the prior provider state.
    if(externalAction&&targetId&&process.env.SUPABASE_SECRET_KEY){
      try{await createSupabaseAdminClient().auth.admin.updateUserById(targetId,{ban_duration:externalAction==="BAN"?"none":"876000h"});}
      catch{console.error("Staff Auth ban compensation failed");}
    }
    return errorReply(error);
  }
}
