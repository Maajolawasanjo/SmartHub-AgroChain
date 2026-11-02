import { type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPrisma } from "@/server/db/prisma";
import { getAccountContext, getIdentity, accountDestination } from "@/server/auth/context";
import { PublicError, assertSameOrigin, errorReply, readJson, reply, requireConfig } from "@/server/auth/http";
import { publicSignupReady, siteUrl } from "@/server/auth/env";
import { emailSchema, passwordSchema, signupSchema } from "@/server/auth/validators";
import { validateRecoveryTicket, clearRecoveryTicket } from "@/server/auth/recovery";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function handle(request:NextRequest, action:string){
 assertSameOrigin(request);
 requireConfig();
 const input=await readJson(request);
 const supabase=await createSupabaseServerClient();
 const db=getPrisma();
 switch(action){
  case "signup": {
   if(!publicSignupReady())throw new PublicError(503,"Registration will open after the service and legal-policy configuration is approved.");
   const data=signupSchema.parse(input);
   const {data:result,error}=await supabase.auth.signUp({
     email:data.email,password:data.password,
     options:{emailRedirectTo:`${siteUrl()}/auth/callback`,data:{full_name:data.fullName}},
   });
   if(error)throw new PublicError(400,"Registration could not be completed. Please check your details or contact support.");
   // Supabase can supply a fake user for an existing address to prevent enumeration.
   if(!result.user || result.user.identities?.length===0)return reply({ok:true,next:"/verify-email"});
   try {
    await db.account.create({data:{id:result.user.id,email:data.email,fullName:data.fullName,phone:data.phone,
      role:data.role==="farmer"?"FARMER":"BUYER",farmName:data.role==="farmer"?data.farmName:null,
      state:data.role==="farmer"?data.state:null}});
   }catch(e){
    console.error("Registration profile write failed",e instanceof Error?e.name:"unknown");
    // No dashboard access exists for an Auth user without a trusted account row.
    throw new PublicError(503,"Account setup is incomplete. Please contact support before retrying registration.");
   }
   return reply({ok:true,next:"/verify-email"},201);
  }
  case "login": {
   const data=z.object({email:emailSchema,password:z.string().min(1)}).parse(input);
   const {data:result,error}=await supabase.auth.signInWithPassword(data);
   if(error?.code==="email_not_confirmed")return reply({ok:true,next:"/verify-email"});
   if(error || !result.user)throw new PublicError(401,"Invalid email or password.");
   const account=await db.account.findUnique({where:{id:result.user.id}});
   if(!account){await supabase.auth.signOut();throw new PublicError(403,"Account provisioning is incomplete. Contact support.");}
   if(account.status!=="ACTIVE"){
    await supabase.auth.signOut();throw new PublicError(403,"Account access is restricted. Please contact support.");
   }
   return reply({ok:true,next:accountDestination({account,user:result.user,supabase})});
  }
  case "forgot": {
   const {email}=z.object({email:emailSchema}).parse(input);
   const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${siteUrl()}/auth/callback?type=recovery`});
   if(error)console.error("Recovery service issue",error.name);
   return reply({ok:true,next:"/forgot-password/sent"});
  }
  case "resend-email": {
   const {email}=z.object({email:emailSchema}).parse(input);
   const {error}=await supabase.auth.resend({type:"signup",email,options:{emailRedirectTo:`${siteUrl()}/auth/callback`}});
   if(error)console.error("Resend service issue",error.name);
   return reply({ok:true,message:"If eligible, a confirmation email will be sent."});
  }
  case "logout": {
   const {error}=await supabase.auth.signOut();
   if(error)throw new PublicError(503,"Unable to sign out. Please try again.");
   await clearRecoveryTicket();
   return reply({ok:true,next:"/login"});
  }
  case "reset-password": {
   const {password,confirmPassword}=z.object({password:passwordSchema,confirmPassword:z.string()}).parse(input);
   if(password!==confirmPassword)throw new PublicError(400,"Passwords do not match.");
   const identity=await getIdentity();
   if(!identity || !(await validateRecoveryTicket(identity.user.id)))throw new PublicError(403,"Recovery link invalid or expired. Request a new link.");
   const {error}=await supabase.auth.updateUser({password});
   if(error)throw new PublicError(400,"Password update failed. Request a new recovery link.");
   await clearRecoveryTicket();await supabase.auth.signOut();
   return reply({ok:true,next:"/reset-password/success"});
  }
  case "start-phone": {
   const ctx=await getAccountContext();
   if(!ctx || ctx.account.status!=="ACTIVE")throw new PublicError(403,"Active account required.");
   if(!ctx.user.email_confirmed_at)throw new PublicError(403,"Verify email before requesting an SMS code.");
   const targetPhone=ctx.account.pendingPhone || (ctx.account.role==="FARMER"?ctx.account.phone:null);
   if(!targetPhone)throw new PublicError(403,"No phone number is awaiting verification.");
   if(!ctx.account.pendingPhone && ctx.user.phone_confirmed_at && ctx.user.phone===ctx.account.phone)return reply({ok:true,next:"/auth/redirect"});
   const now=new Date();const previous=await db.phoneOtpThrottle.findUnique({where:{accountId:ctx.account.id}});
   if(previous){
    if(now.getTime()-previous.lastRequestedAt.getTime()<60_000)throw new PublicError(429,"Please wait one minute before resending.");
    if(now.getTime()-previous.windowStartedAt.getTime()<3_600_000 && previous.countInWindow>=5)throw new PublicError(429,"Too many SMS requests. Try again later.");
   }
   const sameWindow=!!previous && now.getTime()-previous.windowStartedAt.getTime()<3_600_000;
   if(previous){
    const changed=await db.phoneOtpThrottle.updateMany({where:{accountId:ctx.account.id,lastRequestedAt:previous.lastRequestedAt},
      data:{lastRequestedAt:now,windowStartedAt:sameWindow?previous.windowStartedAt:now,countInWindow:sameWindow?previous.countInWindow+1:1}});
    if(changed.count!==1)throw new PublicError(429,"A verification request is already processing.");
   }else{
    try{await db.phoneOtpThrottle.create({data:{accountId:ctx.account.id,lastRequestedAt:now,windowStartedAt:now,countInWindow:1}});}
    catch{throw new PublicError(429,"A verification request is already processing.");}
   }
   // Sends an Auth-managed phone-change OTP, subject to configured Supabase SMS provider.
   // Supabase provides a dedicated resend method for an already pending phone change.
   const result=previous
      ? await supabase.auth.resend({type:"phone_change",phone:targetPhone})
      : await supabase.auth.updateUser({phone:targetPhone});
   if(result.error)throw new PublicError(503,"SMS delivery is unavailable. Please try again later.");
   return reply({ok:true,message:"Verification SMS requested for your registered phone."});
  }
  case "verify-phone": {
   const {token}=z.object({token:z.string().regex(/^\d{6}$/)}).parse(input);
   const ctx=await getAccountContext();
   if(!ctx || ctx.account.status!=="ACTIVE")throw new PublicError(403,"Active account required.");
   if(!ctx.user.email_confirmed_at)throw new PublicError(403,"Email verification is required first.");
   const targetPhone=ctx.account.pendingPhone || (ctx.account.role==="FARMER"?ctx.account.phone:null);
   if(!targetPhone)throw new PublicError(403,"No pending verification exists.");
   const {error}=await supabase.auth.verifyOtp({phone:targetPhone,token,type:"phone_change"});
   if(error)throw new PublicError(400,"Code invalid, expired or already used.");
   const {data,error:userError}=await supabase.auth.getUser();
   if(userError || !data.user || !data.user.phone_confirmed_at || data.user.phone!==targetPhone)
    throw new PublicError(403,"The phone number was not verified. Request another code.");
   await db.account.update({where:{id:ctx.account.id},data:{phone:targetPhone,pendingPhone:null,phoneVerifiedAt:new Date()}});
   return reply({ok:true,next:ctx.account.pendingPhone?"/account/security/phone":"/auth/redirect"});
  }
  case "me": {
   const ctx=await getAccountContext();
   if(!ctx)throw new PublicError(401,"Sign in required.");
   return reply({ok:true,account:{id:ctx.account.id,fullName:ctx.account.fullName,role:ctx.account.role,status:ctx.account.status,
    email:ctx.account.email,phone:ctx.account.phone,farmName:ctx.account.farmName,state:ctx.account.state,
    emailVerified:!!ctx.user.email_confirmed_at,phoneVerified:!!(ctx.user.phone_confirmed_at&&ctx.user.phone===ctx.account.phone)},
    next:accountDestination(ctx)});
  }
  default:throw new PublicError(404,"Unknown authentication action.");
 }
}
export async function POST(request:NextRequest,context:{params:Promise<{action:string}>}){
 try{return await handle(request,(await context.params).action);}catch(e){return errorReply(e);}
}
