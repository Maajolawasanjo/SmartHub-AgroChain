import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAccountContext } from "@/server/auth/context";
import { getPrisma } from "@/server/db/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/server/auth/env";
import { PublicError,assertSameOrigin,errorReply,readJson,reply,requireConfig } from "@/server/auth/http";
import { emailSchema } from "@/server/auth/validators";

export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  assertSameOrigin(request);requireConfig();
  const ctx=await getAccountContext();
  if(!ctx || ctx.account.role!=="SUPER_ADMIN" || ctx.account.status!=="ACTIVE" || !ctx.user.email_confirmed_at)
   throw new PublicError(403,"Only an approved Super Admin may invite staff.");
  if(!process.env.SUPABASE_SECRET_KEY)throw new PublicError(503,"Admin invitation service is not configured.");
  const {email,role}=z.object({email:emailSchema,role:z.enum(["FIELD_AGENT","OPERATIONS"])}).parse(await readJson(request));
  const db=getPrisma();
  if(await db.account.findUnique({where:{email}}))throw new PublicError(409,"This email is already registered. Contact support if staff access is required.");
  if(await db.staffInvitation.findFirst({where:{email,status:"PENDING",expiresAt:{gt:new Date()}}}))
    throw new PublicError(409,"An invitation is already pending for this email.");

  // Save trusted staff role BEFORE issuing an external email. A delivery succeeded / DB write
  // failed scenario can be recovered by verified email at acceptance, without client roles.
  const record=await db.staffInvitation.create({data:{email,role,invitedById:ctx.account.id,
    expiresAt:new Date(Date.now()+7*24*60*60_000)}});
  const {data,error}=await createSupabaseAdminClient().auth.admin.inviteUserByEmail(email,{
    redirectTo:`${siteUrl()}/auth/callback?type=invite`,
  });
  if(error || !data.user){
    await db.staffInvitation.deleteMany({where:{id:record.id,invitedUserId:null,status:"PENDING"}});
    throw new PublicError(503,"Staff invitation could not be delivered. Please retry later.");
  }
  try{
    await db.$transaction(async tx=>{
      const changed=await tx.staffInvitation.updateMany({where:{id:record.id,status:"PENDING",invitedUserId:null},data:{invitedUserId:data.user!.id}});
      if(changed.count!==1)throw new PublicError(409,"Invitation status changed. Refresh first.");
      await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_INVITATION_CREATED",subjectId:data.user!.id}});
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
