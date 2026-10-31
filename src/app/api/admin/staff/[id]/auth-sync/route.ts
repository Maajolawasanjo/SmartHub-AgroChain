import type {NextRequest} from "next/server";
import {z} from "zod";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {assertAdminRecordId,requireAdminApi} from "@/server/admin/guard";
import {isStaffRole} from "@/server/admin/permissions";
import {PublicError,assertSameOrigin,errorReply,readJson,reply} from "@/server/auth/http";
import {verifyCurrentPassword} from "@/server/auth/reauth";
export const runtime="nodejs";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(request);
    const {ctx,db}=await requireAdminApi("staff.manage");
    const {id:rawId}=await context.params;const id=assertAdminRecordId(rawId);
    if(!process.env.SUPABASE_SECRET_KEY)throw new PublicError(503,"The authentication admin service is not configured.");
    const input=z.object({currentPassword:z.string().min(1).max(256)}).parse(await readJson(request));
    await verifyCurrentPassword(ctx.user.email,input.currentPassword,ctx.user.id);
    const admin=createSupabaseAdminClient();
    const result=await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "app_accounts" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const target=await tx.account.findUnique({where:{id},select:{id:true,role:true,status:true}});
      if(!target||!isStaffRole(target.role))throw new PublicError(404,"Staff record not found.");
      if(target.status==="DISABLED")throw new PublicError(409,"Disabled accounts require a separate recovery review.");
      let providerError=false;
      try{const response=await admin.auth.admin.updateUserById(id,{ban_duration:target.status==="SUSPENDED"?"876000h":"none"});providerError=Boolean(response.error);}
      catch{providerError=true;}
      if(providerError){
        await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_AUTH_SYNC_FAILED",subjectId:id,details:{appStatus:target.status}}});
        return {ok:false,message:"Authentication status could not be synchronized. The SmartHub account status was not changed; retry after checking Supabase Auth."};
      }
      await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_AUTH_SYNCED",subjectId:id,details:{appStatus:target.status,providerBanApplied:target.status==="SUSPENDED"}}});
      return {ok:true,message:`Supabase Auth ban synchronized to the current ${target.status.toLowerCase()} SmartHub status.`};
    },{timeout:30000,maxWait:10000});
    if(!result.ok)throw new PublicError(503,result.message);
    return reply({ok:true,message:result.message});
  }catch(error){return errorReply(error);}
}
