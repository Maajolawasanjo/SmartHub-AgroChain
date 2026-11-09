import type { NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPrisma } from "@/server/db/prisma";
import { getAccountContext } from "@/server/auth/context";
import { PublicError,assertSameOrigin,errorReply,readJson,reply,requireConfig } from "@/server/auth/http";
import { emailSchema,passwordSchema,phoneSchema } from "@/server/auth/validators";
import { verifyCurrentPassword } from "@/server/auth/reauth";
import { requireOperationsMfaForActor } from "@/server/operations/mfa-policy";
import { requirePrivilegedMfaForSuperAdminActor } from "@/server/admin/privileged-actor-mfa";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function handle(request:NextRequest,action:string){
 assertSameOrigin(request);requireConfig();
 const data=await readJson(request);
 const ctx=await getAccountContext();
 if(!ctx || ctx.account.status!=="ACTIVE")throw new PublicError(401,"Sign in with an active account to continue.");
 // Protected credential/contact changes need AAL2 once the approved rollout
 // starts; logout, revoke-others and recovery must remain possible from AAL1.
 // A verified provider email and authoritative role/status are still required.
 if (["password","email","phone"].includes(action)) {
  if (ctx.account.role==="OPERATIONS") await requireOperationsMfaForActor(ctx);
  if (ctx.account.role==="SUPER_ADMIN") await requirePrivilegedMfaForSuperAdminActor(ctx);
 }
 const db=getPrisma();
 const supabase=await createSupabaseServerClient();
 switch(action){
  case "profile": {
   const {fullName}=z.object({fullName:z.string().trim().min(2).max(160)}).parse(data);
   await db.$transaction([
    db.account.update({where:{id:ctx.account.id},data:{fullName}}),
    db.auditEvent.create({data:{actorId:ctx.account.id,action:"PROFILE_UPDATED"}}),
   ]);
   return reply({ok:true,message:"Profile updated.",next:"/account/profile"});
  }
  case "password": {
   const values=z.object({currentPassword:z.string().min(1),password:passwordSchema,confirmPassword:z.string()}).parse(data);
   if(values.password!==values.confirmPassword)throw new PublicError(400,"Passwords do not match.");
   await verifyCurrentPassword(ctx.user.email,values.currentPassword,ctx.user.id);
   const update=await supabase.auth.updateUser({password:values.password});
   if(update.error)throw new PublicError(400,"Password change failed.");
   await db.auditEvent.create({data:{actorId:ctx.account.id,action:"PASSWORD_CHANGED"}});
   return reply({ok:true,message:"Password changed successfully.",next:"/account/security"});
  }
  case "email": {
   const {email,currentPassword}=z.object({email:emailSchema,currentPassword:z.string().min(1)}).parse(data);
   await verifyCurrentPassword(ctx.user.email,currentPassword,ctx.user.id);
   if(email===ctx.user.email?.toLowerCase())throw new PublicError(400,"New email must be different.");
   const {error}=await supabase.auth.updateUser({email});
   if(error)throw new PublicError(400,"Unable to request email change.");
   await db.auditEvent.create({data:{actorId:ctx.account.id,action:"EMAIL_CHANGE_REQUESTED"}});
   return reply({ok:true,message:"Check the required confirmation messages before the email change becomes active.",next:"/account/security/email"});
  }
  case "phone": {
   // Keep current contact authoritative until a real phone OTP confirms the replacement.
   const {phone,currentPassword}=z.object({phone:phoneSchema,currentPassword:z.string().min(1)}).parse(data);
   await verifyCurrentPassword(ctx.user.email,currentPassword,ctx.user.id);
   if(phone===ctx.account.phone)throw new PublicError(400,"New number must be different.");
   await db.$transaction([
     db.account.update({where:{id:ctx.account.id},data:{pendingPhone:phone}}),
     db.auditEvent.create({data:{actorId:ctx.account.id,action:"PHONE_CHANGE_REQUESTED"}}),
   ]);
   return reply({ok:true,next:"/account/security/phone",message:"New number recorded as pending. Request and confirm its SMS code to activate it."});
  }
  case "revoke-others": {
   const {currentPassword}=z.object({currentPassword:z.string().min(1)}).parse(data);
   await verifyCurrentPassword(ctx.user.email,currentPassword,ctx.user.id);
   // Existing JWTs may remain valid until expiry. Supabase revokes other refresh sessions.
   const {error}=await supabase.auth.signOut({scope:"others"});
   if(error)throw new PublicError(503,"Could not revoke other sessions. Try again.");
   await db.auditEvent.create({data:{actorId:ctx.account.id,action:"OTHER_SESSIONS_REVOKED"}});
   return reply({ok:true,message:"Other refresh sessions were revoked. Existing access tokens can remain valid until expiry."});
  }
  case "delete-cancel": {
   const {confirmation}=z.object({confirmation:z.literal("CANCEL")}).parse(data);
   if(confirmation!=="CANCEL")throw new PublicError(400,"Please confirm cancellation.");
   const pending=await db.deletionRequest.findFirst({where:{accountId:ctx.account.id,status:"REQUESTED"},orderBy:{requestedAt:"desc"}});
   if(!pending)throw new PublicError(409,"There is no cancellable request. Contact support if review has started.");
   await db.$transaction(async tx=>{
     const changed=await tx.deletionRequest.updateMany({where:{id:pending.id,accountId:ctx.account.id,status:"REQUESTED"},data:{status:"CANCELLED",reviewedAt:new Date()}});
     if(changed.count!==1)throw new PublicError(409,"Request status changed. Refresh the page.");
     await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"ACCOUNT_DELETION_REQUEST_CANCELLED"}});
   });
   return reply({ok:true,next:"/account/delete/cancelled",message:"Your pending deletion request was cancelled."});
  }
  case "delete-request": {
   const {confirmation,password}=z.object({confirmation:z.literal("DELETE"),password:z.string().min(1)}).parse(data);
   if(!ctx.user.email)throw new PublicError(403,"Account email unavailable.");
   await verifyCurrentPassword(ctx.user.email,password,ctx.user.id);
   const pending=await db.deletionRequest.findFirst({where:{accountId:ctx.account.id,status:{in:["REQUESTED","UNDER_REVIEW"]}}});
   if(pending)return reply({ok:true,next:"/account/delete/pending",message:"Your request is already pending review."});
   await db.$transaction([
    db.deletionRequest.create({data:{accountId:ctx.account.id}}),
    db.auditEvent.create({data:{actorId:ctx.account.id,action:"ACCOUNT_DELETION_REQUESTED"}}),
   ]);
   return reply({ok:true,next:"/account/delete/requested",message:"Deletion request recorded. Your account has not yet been deleted."});
  }
  default:throw new PublicError(404,"Unknown account action.");
 }
}
export async function POST(request:NextRequest,context:{params:Promise<{action:string}>}){
 try{return await handle(request,(await context.params).action);}catch(e){return errorReply(e);}
}
