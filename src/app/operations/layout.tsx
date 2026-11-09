import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/server/auth/context";
import { operationsMfaEnforcementEnabled } from "@/server/operations/mfa-policy";
import { privilegedMfaEnforcementEnabled, inspectCurrentPrivilegedMfaAccess } from "@/server/admin/privileged-mfa-enforcement";

export const dynamic = "force-dynamic";

/**
 * Additional portal-wide defense: independently protect Operations pages
 * even when new pages forget to call requirePortal. This does not replace
 * route-level, record-scope or provider-action authorization.
 */
export default async function OperationsLayout({children}:{children:ReactNode}) {
  const ctx = await getAccountContext();
  if (!ctx) redirect("/login");
  if (ctx.account.status !== "ACTIVE") redirect("/account/status");
  if (!ctx.user.email_confirmed_at) redirect("/verify-email");
  if (!["OPERATIONS","SUPER_ADMIN"].includes(ctx.account.role)) redirect("/forbidden");

  if (ctx.account.role === "OPERATIONS" && operationsMfaEnforcementEnabled()) {
    const evidence = await inspectCurrentPrivilegedMfaAccess(ctx.supabase.auth.mfa);
    if (!evidence.allowed) redirect("/account/security/operations-mfa");
  }
  if (ctx.account.role === "SUPER_ADMIN" && privilegedMfaEnforcementEnabled()) {
    const evidence = await inspectCurrentPrivilegedMfaAccess(ctx.supabase.auth.mfa);
    if (!evidence.allowed) redirect("/account/security/mfa");
  }
  return <>{children}</>;
}
