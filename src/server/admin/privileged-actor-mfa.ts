import "server-only";
import type { getAccountContext } from "@/server/auth/context";
import { PublicError } from "@/server/auth/http";
import {
  privilegedMfaEnforcementEnabled,
  inspectCurrentPrivilegedMfaAccess,
} from "@/server/admin/privileged-mfa-enforcement";

type CurrentActor = NonNullable<Awaited<ReturnType<typeof getAccountContext>>>;

/**
 * R01.3D.3B — additional AAL2 boundary for the existing, independently
 * authorized SUPER_ADMIN actor in specialist service paths that do not use
 * requireAdminApi. Does NOT grant permission, replace roles, or approve
 * financial transactions.
 *
 * This is dormant until R00-D01/D04/D09 and all mandatory rollout signoffs
 * are recorded. Never enable the enforcement switch before Operations,
 * remaining direct routes, MFA recovery, and live integration are reviewed.
 */
export async function requirePrivilegedMfaForSuperAdminActor(
  ctx: CurrentActor,
): Promise<void> {
  // Keep existing behavior while the approved rollout is incomplete.
  if (!privilegedMfaEnforcementEnabled()) return;

  // Defense in depth. This helper MUST be called only after an existing
  // role-specific service/route authorization check, not as a substitute.
  if (ctx.account.role !== "SUPER_ADMIN" ||
      ctx.account.status !== "ACTIVE" ||
      !ctx.user.email_confirmed_at ||
      ctx.user.id !== ctx.account.id)
    throw new PublicError(403, "The current Super Admin identity is not authorized.");

  const result = await inspectCurrentPrivilegedMfaAccess(ctx.supabase.auth.mfa);
  if (!result.allowed)
    throw new PublicError(
      403,
      "An authenticator challenge is required. Open account security to continue.",
    );
}
