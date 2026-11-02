import "server-only";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/server/auth/context";
import { getPrisma } from "@/server/db/prisma";
import { PublicError, requireConfig } from "@/server/auth/http";
import { hasPermission, type Permission } from "./permissions";
import { z } from "zod";

export async function requireSuperAdminPage(){
  const ctx=await getAccountContext();
  if(!ctx)redirect("/login");
  if(ctx.account.status!=="ACTIVE")redirect("/account/status");
  if(!ctx.user.email_confirmed_at)redirect("/verify-email");
  if(ctx.account.role!=="SUPER_ADMIN")redirect("/forbidden");
  return ctx;
}

export async function requireAdminApi(permission:Permission="staff.manage"){
  requireConfig();
  const ctx=await getAccountContext();
  if(!ctx)throw new PublicError(401,"Sign in to continue.");
  if(ctx.account.status!=="ACTIVE"||!ctx.user.email_confirmed_at||!hasPermission(ctx.account.role,permission))
    throw new PublicError(403,"You do not have permission to perform this action.");
  return {ctx,db:getPrisma()};
}

export function assertAdminRecordId(value:string){
  if(!z.string().uuid().safeParse(value).success)throw new PublicError(404,"Record not found.");
  return value;
}
