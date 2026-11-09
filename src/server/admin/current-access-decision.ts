import "server-only";
import type { AccountRole, AccountStatus } from "@/generated/prisma/client";
import {
  hasPermission,
  isAdministrativePermission,
  type AdminApiPermission,
} from "@/server/admin/permissions";

/**
 * R01.3A: one fail-closed decision contract for the EXISTING fixed Admin role
 * model. This is not a custom-grant engine: no new role, override, MFA claim,
 * financial authority or scope can be inferred from this function.
 *
 * The existing requireAdminApi checks remain as defense in depth during the
 * staged migration. The future effective-permission model requires R00-D01,
 * R00-D04 and R00-D09 approvals before replacing this evaluator.
 */
export type CurrentAdminAccessDecision =
  | Readonly<{ allowed: true; source: "CURRENT_FIXED_ROLE_MATRIX" }>
  | Readonly<{
      allowed: false;
      reason:
        | "ACCOUNT_INACTIVE"
        | "EMAIL_UNVERIFIED"
        | "NON_ADMIN_ROLE"
        | "CAPABILITY_NOT_DECLARED"
        | "CAPABILITY_NOT_GRANTED";
    }>;

export function evaluateCurrentAdminCapability(input: {
  role: AccountRole;
  status: AccountStatus;
  emailConfirmed: boolean;
  permission: AdminApiPermission;
}): CurrentAdminAccessDecision {
  if (input.status !== "ACTIVE")
    return { allowed: false, reason: "ACCOUNT_INACTIVE" };
  if (!input.emailConfirmed)
    return { allowed: false, reason: "EMAIL_UNVERIFIED" };
  if (input.role !== "OPERATIONS" && input.role !== "SUPER_ADMIN")
    return { allowed: false, reason: "NON_ADMIN_ROLE" };
  if (!isAdministrativePermission(input.permission))
    return { allowed: false, reason: "CAPABILITY_NOT_DECLARED" };
  if (!hasPermission(input.role, input.permission))
    return { allowed: false, reason: "CAPABILITY_NOT_GRANTED" };
  return { allowed: true, source: "CURRENT_FIXED_ROLE_MATRIX" };
}
