import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authConfigReady, siteUrl } from "@/server/auth/env";
import { reconcilePublicAccount } from "@/server/auth/provisioning";
import { setRecoveryTicket } from "@/server/auth/recovery";

export const runtime="nodejs";
export const dynamic="force-dynamic";

// Email verification/recovery links contain an OTP token hash in the URL.
// Neither the callback nor its redirects may be cached, indexed or used as a
// Referrer to subsequent app routes or external assets.
const callbackHeaders={
 "Cache-Control":"private, no-store",
 "Referrer-Policy":"no-referrer",
 "X-Robots-Tag":"noindex, nofollow",
};
export async function GET(request:NextRequest) {
 // A request's Host / nextUrl.origin is untrusted and must never become the
 // fallback redirect destination when V2's reviewed Auth/DB config is missing.
 // Fail closed without calling Supabase or reflecting token_hash.
 if(!authConfigReady()){
  return NextResponse.json({error:"Account verification is temporarily unavailable."},
   {status:503,headers:callbackHeaders});
 }
 const origin=siteUrl();
 const go=(path:string)=>NextResponse.redirect(new URL(path,origin),{headers:callbackHeaders});
 const fail=()=>go("/auth/error");
 const token_hash=request.nextUrl.searchParams.get("token_hash");
 const type=request.nextUrl.searchParams.get("type");
 if(!token_hash || token_hash.length>512 || !type ||
  !["email","signup","recovery","invite","email_change"].includes(type))return fail();
 try {
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.auth.verifyOtp({token_hash,type:type as EmailOtpType});
  if(error)return fail();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return fail();
  if(type==="email"||type==="signup"||type==="email_change"){
    // This is idempotent; staff invitations have no public signup intent.
    await reconcilePublicAccount(user);
  }
  if(type==="recovery"){
   await setRecoveryTicket(user.id);
   return go("/reset-password");
  }
  if(type==="invite")return go("/invite/accept");
  return go("/auth/redirect");
 }catch{return fail();}
}
