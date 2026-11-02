import type { NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getIdentity } from "@/server/auth/context";
import { getPrisma } from "@/server/db/prisma";
import { PublicError,assertSameOrigin,errorReply,readJson,reply,requireConfig } from "@/server/auth/http";
import { passwordSchema } from "@/server/auth/validators";

export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  assertSameOrigin(request);requireConfig();
  const {fullName,password}=z.object({fullName:z.string().trim().min(2).max(160),password:passwordSchema}).parse(await readJson(request));
  const ctx=await getIdentity();
  if(!ctx?.user?.email || !ctx.user.email_confirmed_at)throw new PublicError(403,"An authenticated, confirmed invitation session is required.");
  const db=getPrisma();
  const invitation=await db.staffInvitation.findFirst({where:{email:ctx.user.email.toLowerCase(),
    OR:[{invitedUserId:ctx.user.id},{invitedUserId:null}],
    status:"PENDING",expiresAt:{gt:new Date()}}});
  if(!invitation || !["FIELD_AGENT","OPERATIONS"].includes(invitation.role))throw new PublicError(403,"Your staff invitation is invalid, expired or already used.");
  const existing=await db.account.findUnique({where:{id:ctx.user.id}});
  if(existing)throw new PublicError(409,"This identity already has an account. Contact your administrator.");
  const supabase=await createSupabaseServerClient();
  const update=await supabase.auth.updateUser({password});
  if(update.error)throw new PublicError(400,"Unable to set account credentials.");
  await db.$transaction(async tx=>{
    const claimed=await tx.staffInvitation.updateMany({where:{id:invitation.id,status:"PENDING",expiresAt:{gt:new Date()}},
       data:{status:"ACCEPTED",acceptedAt:new Date(),invitedUserId:ctx.user.id}});
    if(claimed.count!==1)throw new PublicError(409,"Invitation already processed.");
    await tx.account.create({data:{id:ctx.user.id,email:ctx.user.email!.toLowerCase(),fullName,phone:"",role:invitation.role}});
    await tx.auditEvent.create({data:{actorId:ctx.user.id,action:"STAFF_INVITATION_ACCEPTED"}});
  });
  return reply({ok:true,next:"/auth/redirect"});
 }catch(e){return errorReply(e);}
}
