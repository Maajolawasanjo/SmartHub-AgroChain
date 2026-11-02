import { redirect } from "next/navigation";
import { authConfigReady } from "@/server/auth/env";
import { getAccountContext, accountDestination, mayAccess } from "@/server/auth/context";
import { AuthExperience } from "./auth-experience";
import { LiveAuth } from "./live-auth";
import { DeletionStatus } from "./deletion-status";

const live=new Set(["/signup","/login","/forgot-password","/verify-email","/verify-phone","/reset-password","/logout",
 "/account/profile","/account/security/password","/account/security/email","/account/security/phone",
 "/account/delete","/account/delete/confirm","/admin/staff/invite","/admin/staff/new","/invite/accept","/invite/profile",
 "/operations/account","/field-agent/account","/admin/account"]);
const privatePath=(route:string)=>(route.startsWith("/account/") && route!=="/account/help")||route.startsWith("/admin/")||route.startsWith("/operations/")||route.startsWith("/field-agent/");
export async function AuthPage({route}:{route:string}){
 const enabled=authConfigReady();
 let authenticated=false;
 if(enabled && privatePath(route)){
  const ctx=await getAccountContext();
  if(!ctx)redirect("/login");
  if(ctx.account.status!=="ACTIVE"&&route!=="/account/status")redirect("/account/status");
  if(!ctx.user.email_confirmed_at&&route!=="/account/status")redirect("/verify-email");
  if(!mayAccess(ctx,route))redirect("/forbidden");
  authenticated=true;
 }
 if(enabled && route.startsWith("/account/delete/") && route!=="/account/delete/confirm")return <DeletionStatus route={route}/>;
 if(enabled && live.has(route))return <LiveAuth route={route}/>;
 return <AuthExperience route={route} authenticated={authenticated} previewEnabled={!enabled && process.env.NODE_ENV!=="production"}/>;
}
