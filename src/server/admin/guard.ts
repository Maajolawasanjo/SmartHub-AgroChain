import "server-only";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/server/auth/context";
import { getPrisma } from "@/server/db/prisma";
import { PublicError, requireConfig } from "@/server/auth/http";
import { hasPermission, isAdministrativePermission, type AdminApiPermission } from "./permissions";
import { evaluateCurrentAdminCapability } from "./current-access-decision";
import { z } from "zod";

export async function requireSuperAdminPage(){
  const ctx=await getAccountContext();
  if(!ctx)redirect("/login");
  if(ctx.account.status!=="ACTIVE")redirect("/account/status");
  if(!ctx.user.email_confirmed_at)redirect("/verify-email");
  if(ctx.account.role!=="SUPER_ADMIN")redirect("/forbidden");
  return ctx;
}

export async function requireAdminApi(permission:AdminApiPermission="staff.manage"){
  requireConfig();
  const ctx=await getAccountContext();
  if(!ctx)throw new PublicError(401,"Sign in to continue.");
  // Preserve the existing authorization gate during the central-decision migration.
  // It is deliberately duplicated by the new resolver to prove no access expansion.
  if(ctx.account.status!=="ACTIVE"||!ctx.user.email_confirmed_at||!["SUPER_ADMIN","OPERATIONS"].includes(ctx.account.role)||!isAdministrativePermission(permission)||!hasPermission(ctx.account.role,permission))
    throw new PublicError(403,"You do not have permission to perform this action.");
  const decision=evaluateCurrentAdminCapability({
    role:ctx.account.role,
    status:ctx.account.status,
    emailConfirmed:Boolean(ctx.user.email_confirmed_at),
    permission
  });
  if(!decision.allowed)throw new PublicError(403,"You do not have permission to perform this action.");
  return {ctx,db:getPrisma()};
}

export function assertAdminRecordId(value:string){
  if(!z.string().uuid().safeParse(value).success)throw new PublicError(404,"Record not found.");
  return value;
}
