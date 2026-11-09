import "server-only";
import type { getAccountContext } from "@/server/auth/context";
import { PublicError } from "@/server/auth/http";
import decisions from "../../../docs/implementation/r00-gates.json";
import {
  privilegedMfaEnforcementEnabled,
  inspectCurrentPrivilegedMfaAccess,
} from "@/server/admin/privileged-mfa-enforcement";

type AccountContext = NonNullable<Awaited<ReturnType<typeof getAccountContext>>>;
const approved = (id: string): boolean => {
  const gate = decisions.gates.find(item => item.id === id) as
    | { status: string; decision_record_ref: unknown; approved_by: unknown; approved_at: unknown }
    | undefined;
  return gate?.status === "APPROVED" &&
    typeof gate.decision_record_ref === "string" && gate.decision_record_ref.trim().length > 0 &&
    typeof gate.approved_by === "string" && gate.approved_by.trim().length > 0 &&
    typeof gate.approved_at === "string" && gate.approved_at.trim().length > 0;
};

/** Independent Operations MFA pilot. A deploy variable alone cannot activate it. */
export function operationsMfaPilotEnabled(): boolean {
  return approved("R00-D01") && approved("R00-D04") &&
    process.env.OPERATIONS_MFA_PILOT_ENABLED === "true";
}

/**
 * Additional Operations authorization boundary, not an authority grant.
 * Requires the approved overall privileged rollout, separate Operations
 * entrypoint review, real enrollment acceptance and tested recovery.
 * Until owner decisions and signoffs are present this returns false.
 */
export function operationsMfaEnforcementEnabled(): boolean {
  return operationsMfaPilotEnabled() &&
    // Independent finance authority must be approved even if the parent
    // privileged enforcement policy is later refactored.
    approved("R00-D09") &&
    privilegedMfaEnforcementEnabled() &&
    process.env.OPERATIONS_MFA_ENFORCEMENT_ENABLED === "true" &&
    process.env.OPERATIONS_MFA_ALL_ENTRYPOINTS_SIGNOFF === "true" &&
    process.env.OPERATIONS_MFA_RECOVERY_SIGNOFF === "true" &&
    process.env.OPERATIONS_MFA_ENROLLMENT_VERIFIED === "true";
}

/**
 * Invoke only AFTER the current server-side Operations role/permission check.
 * No provider calls before an approved rollout. No local factor cache.
 */
export async function requireOperationsMfaForActor(ctx: AccountContext): Promise<void> {
  if (!operationsMfaEnforcementEnabled()) return;
  if (ctx.account.role !== "OPERATIONS" || ctx.account.status !== "ACTIVE" ||
      !ctx.user.email_confirmed_at || ctx.user.id !== ctx.account.id)
    throw new PublicError(403, "The current Operations identity is not authorized.");

  const evidence = await inspectCurrentPrivilegedMfaAccess(ctx.supabase.auth.mfa);
  if (!evidence.allowed)
    throw new PublicError(403, "Complete the authenticator challenge in account security.");
}
