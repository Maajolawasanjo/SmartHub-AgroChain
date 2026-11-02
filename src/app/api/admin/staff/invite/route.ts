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
  const existing=await db.staffInvitation.findFirst({where:{email,status:"PENDING",expiresAt:{gt:new Date()}}});
  if(existing)throw new PublicError(409,"An active invitation already exists for this address.");
  const {data,error}=await createSupabaseAdminClient().auth.admin.inviteUserByEmail(email,{redirectTo:`${siteUrl()}/auth/callback?type=invite`});
  if(error || !data.user)throw new PublicError(400,"Unable to invite this account. Check whether it is already registered.");
  await db.$transaction([
   db.staffInvitation.create({data:{email,role,invitedUserId:data.user.id,invitedById:ctx.account.id,
      expiresAt:new Date(Date.now()+7*24*60*60_000)}}),
   db.auditEvent.create({data:{actorId:ctx.account.id,action:"STAFF_INVITATION_CREATED",subjectId:data.user.id}}),
  ]);
  return reply({ok:true,message:"Staff invitation issued. Access will be granted only after valid acceptance."},201);
 }catch(e){return errorReply(e);}
}
