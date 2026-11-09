import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAccountContext } from "@/server/auth/context";
import { getPrisma } from "@/server/db/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/server/auth/env";
import { PublicError,assertSameOrigin,errorReply,readJson,reply,requireConfig } from "@/server/auth/http";
import { emailSchema } from "@/server/auth/validators";
import { verifyCurrentPassword } from "@/server/auth/reauth";
import { STAFF_ROLES } from "@/server/admin/permissions";
import {requirePrivilegedMfaForSuperAdminActor} from "@/server/admin/privileged-actor-mfa";

export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  assertSameOrigin(request);requireConfig();
  const ctx=await getAccountContext();
  if(!ctx || ctx.account.role!=="SUPER_ADMIN" || ctx.account.status!=="ACTIVE" || !ctx.user.email_confirmed_at)
   throw new PublicError(403,"Only an approved Super Admin may invite staff.");
  // Direct privileged route: require server-verified MFA when the approved
  // enforcement gate is active, before reserving or sending an invitation.
  await requirePrivilegedMfaForSuperAdminActor(ctx);
  if(!process.env.SUPABASE_SECRET_KEY)throw new PublicError(503,"Admin invitation service is not configured.");
  const {email,role,currentPassword}=z.object({email:emailSchema,role:z.enum(STAFF_ROLES),currentPassword:z.string().min(1).max(256)}).parse(await readJson(request));
  await verifyCurrentPassword(ctx.user.email,currentPassword,ctx.user.id);
  const db=getPrisma();
  if(await db.account.findUnique({where:{email}}))throw new PublicError(409,"This email is already registered. Contact support if staff access is required.");
  const now=new Date();
  if(await db.staffInvitation.findFirst({where:{email,status:"PENDING",expiresAt:{gt:now}}}))
    throw new PublicError(409,"An invitation is already pending for this email.");

  // Expire stale invites and reserve the single pending slot atomically before sending email.
  let record:{id:string};
  try{
    record=await db.$transaction(async tx=>{
      await tx.staffInvitation.updateMany({where:{email,status:"PENDING",expiresAt:{lte:now}},data:{status:"EXPIRED"}});
      return tx.staffInvitation.create({data:{email,role,invitedById:ctx.account.id,
        expiresAt:new Date(now.getTime()+7*24*60*60_000)}});
    });
  }catch(error){
    if(typeof error==="object"&&error!==null&&"code" in error&&(error as {code?:unknown}).code==="P2002")
      throw new PublicError(409,"An invitation is already pending for this email.");
    throw error;
  }

  // Keep delivery failures non-accepting; an ambiguous provider response must never grant staff access.
  let inviteUserId:string|undefined;
  let deliveryState:"DELIVERY_FAILED"|"DELIVERY_UNCERTAIN"|undefined;
  try{
    const result=await createSupabaseAdminClient().auth.admin.inviteUserByEmail(email,{redirectTo:`${siteUrl()}/auth/callback?type=invite`});
    if(result.error){deliveryState="DELIVERY_FAILED";}else if(result.data.user){inviteUserId=result.data.user.id;}else{deliveryState="DELIVERY_UNCERTAIN";}
  }catch{
    deliveryState="DELIVERY_UNCERTAIN";
  }
  if(deliveryState){
    await db.staffInvitation.updateMany({where:{id:record.id,status:"PENDING"},data:{status:deliveryState}});
    await db.auditEvent.create({data:{actorId:ctx.account.id,action:deliveryState==="DELIVERY_FAILED"?"STAFF_INVITATION_DELIVERY_FAILED":"STAFF_INVITATION_DELIVERY_UNCERTAIN",subjectId:record.id,details:{role}}});
    throw new PublicError(503,deliveryState==="DELIVERY_FAILED"?"Invitation delivery failed. The invite is blocked from acceptance; review its delivery status before trying again.":"Invitation delivery could not be confirmed. It has been blocked from acceptance and needs administrator review.");
  }
  if(!inviteUserId)throw new PublicError(503,"Invitation delivery needs reconciliation. The invite remains non-accepting until reviewed.");
  try{
    await db.$transaction(async tx=>{
      const changed=await tx.staffInvitation.updateMany({where:{id:record.id,status:"PENDING",invitedUserId:null},data:{invitedUserId:inviteUserId}});
      if(changed.count!==1)throw new PublicError(409,"Invitation status changed. Refresh first.");
      await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_INVITATION_CREATED",subjectId:inviteUserId,details:{role}}});
    });
  }catch(error){
    console.error("Invited identity delivery needs reconciliation",error instanceof Error?error.name:"unknown");
    // Keep the saved pending invitation. Acceptance can bind only a real confirmed
    // Supabase invite identity with this email; no second invitation is sent.
    throw new PublicError(503,"Invitation delivery needs review. Do not send another invitation yet.");
  }
  return reply({ok:true,message:"Invitation recorded and sent; access is granted only after acceptance."},201);
 }catch(e){return errorReply(e);}
}
