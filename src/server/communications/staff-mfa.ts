import "server-only";
import type { getAccountContext } from "@/server/auth/context";
import { PublicError } from "@/server/auth/http";
import { requireOperationsMfaForActor } from "@/server/operations/mfa-policy";
import { requirePrivilegedMfaForSuperAdminActor } from "@/server/admin/privileged-actor-mfa";

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
