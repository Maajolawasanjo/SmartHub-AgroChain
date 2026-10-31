import "server-only";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/server/auth/context";
import { getPrisma } from "@/server/db/prisma";
import { PublicError, requireConfig } from "@/server/auth/http";
import { hasPermission, type Permission } from "@/server/admin/permissions";

export async function requireFieldAgentPage(){
  const ctx=await getAccountContext();
  if(!ctx)redirect("/login");
  if(ctx.account.status!=="ACTIVE")redirect("/account/status");
  if(!ctx.user.email_confirmed_at)redirect("/verify-email");
  if(!hasPermission(ctx.account.role,permission))redirect("/forbidden");
  return {...ctx,db:getPrisma()};
}

export async function requireFieldAgentApi(permission:Permission="field.assigned.read"){
  requireConfig();
  const ctx=await getAccountContext();
  if(!ctx)throw new PublicError(401,"Sign in to continue.");
  if(ctx.account.status!=="ACTIVE"||!ctx.user.email_confirmed_at||!hasPermission(ctx.account.role,permission))
    throw new PublicError(403,"Active Field Agent access is required.");
  return {ctx,db:getPrisma()};
}
