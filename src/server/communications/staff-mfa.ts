import "server-only";
import type { getAccountContext } from "@/server/auth/context";
import { PublicError } from "@/server/auth/http";
import { requireOperationsMfaForActor } from "@/server/operations/mfa-policy";
import { requirePrivilegedMfaForSuperAdminActor } from "@/server/admin/privileged-actor-mfa";
import { operationsMfaEnforcementEnabled } from "@/server/operations/mfa-policy";
import { privilegedMfaEnforcementEnabled, inspectCurrentPrivilegedMfaAccess } from "@/server/admin/privileged-mfa-enforcement";

type WorkspaceContext = NonNullable<Awaited<ReturnType<typeof getAccountContext>>>;

/**
 * R01.3D.3D. Support workflow actions live outside /admin and /operations.
 * Call only AFTER existing active-account, verified-email and staff role
 * authorization; this never authorizes a support transition or case scope.
 *
 * Both provider checks are dormant while owner/recovery/rollout gates are
 * unapproved. The AAL1 account-recovery and opening a new support case path
 * must not acquire a circular privileged MFA dependency.
 */
export async function requireSupportStaffMfa(ctx: WorkspaceContext): Promise<void> {
  if (ctx.account.role === "OPERATIONS") {
    await requireOperationsMfaForActor(ctx);
    return;
  }
  if (ctx.account.role === "SUPER_ADMIN") {
    await requirePrivilegedMfaForSuperAdminActor(ctx);
    return;
  }
  throw new PublicError(403, "Support staff authorization is required.");
}

/**
 * Only staff with an approved live AAL2 session may read other customers'
 * support cases and internal notes once enforcement is active.
 *
 * When MFA is not approved, retain the currently authorized staff view.
 * When active and the factor provider fails, downgrade to case-owner scope,
 * not an authorization error: lost-device support must remain reachable.
 */
export async function canReadPrivilegedSupportCases(ctx: WorkspaceContext): Promise<boolean> {
  const { account, user } = ctx;
  if (account.status !== "ACTIVE" || !user.email_confirmed_at ||
      account.id !== user.id) return false;
  if (account.role === "OPERATIONS") {
    if (!operationsMfaEnforcementEnabled()) return true;
  } else if (account.role === "SUPER_ADMIN") {
    if (!privilegedMfaEnforcementEnabled()) return true;
  } else {
    return false;
  }
  const assurance = await inspectCurrentPrivilegedMfaAccess(ctx.supabase.auth.mfa);
  return assurance.allowed;
}
