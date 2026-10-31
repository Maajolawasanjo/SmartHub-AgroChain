import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authConfigReady } from "@/server/auth/env";
import { setRecoveryTicket } from "@/server/auth/recovery";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
 const origin=request.nextUrl.origin;
 const fail=()=>NextResponse.redirect(new URL("/auth/error",origin));
 if(!authConfigReady())return fail();
 const token_hash=request.nextUrl.searchParams.get("token_hash");
 const type=request.nextUrl.searchParams.get("type")??"email";
 if(!token_hash || !["email","signup","recovery","invite","email_change"].includes(type))return fail();
 try {
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.auth.verifyOtp({token_hash,type:type as EmailOtpType});
  if(error)return fail();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return fail();
  if(type==="recovery"){
   await setRecoveryTicket(user.id);
   return NextResponse.redirect(new URL("/reset-password",origin));
  }
  if(type==="invite")return NextResponse.redirect(new URL("/invite/accept",origin));
  return NextResponse.redirect(new URL("/auth/redirect",origin));
 }catch{return fail();}
}
