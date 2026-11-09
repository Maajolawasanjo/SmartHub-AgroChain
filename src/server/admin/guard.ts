import "server-only";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/server/auth/context";
import { getPrisma } from "@/server/db/prisma";
import { PublicError, requireConfig } from "@/server/auth/http";
import { hasPermission, isAdministrativePermission, type AdminApiPermission } from "./permissions";
import { evaluateCurrentAdminCapability } from "./current-access-decision";
import { privilegedMfaEnforcementEnabled, inspectCurrentPrivilegedMfaAccess } from "./privileged-mfa-enforcement";
import { z } from "zod";

export async function requireSuperAdminPage(){
  const ctx=await getAccountContext();
  if(!ctx)redirect("/login");
  if(ctx.account.status!=="ACTIVE")redirect("/account/status");
  if(!ctx.user.email_confirmed_at)redirect("/verify-email");
  if(ctx.account.role!=="SUPER_ADMIN")redirect("/forbidden");
  // This additional boundary remains dormant until the signed governance,
  // recovery, and full-entrypoint rollout gates are all approved. The step-up
  // destination lives OUTSIDE /admin to avoid an AAL1 lockout loop.
  if (privilegedMfaEnforcementEnabled()) {
    const mfa = await inspectCurrentPrivilegedMfaAccess(ctx.supabase.auth.mfa);
    if (!mfa.allowed) redirect("/account/security/mfa");
  }
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
  // Current Admin API permissions stay authoritative. AAL2 is an additional,
  // never substitutive check for the existing SUPER_ADMIN role only. Operations
  // privilege rollout remains a separately tracked integration requirement.
  if (ctx.account.role==="SUPER_ADMIN" && privilegedMfaEnforcementEnabled()) {
    const mfa = await inspectCurrentPrivilegedMfaAccess(ctx.supabase.auth.mfa);
    if (!mfa.allowed)
      throw new PublicError(403,"An authenticator challenge is required. Open account security to continue.");
  }
  return {ctx,db:getPrisma()};
}

export function assertAdminRecordId(value:string){
  if(!z.string().uuid().safeParse(value).success)throw new PublicError(404,"Record not found.");
  return value;
}
