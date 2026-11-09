import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import decisions from "../../../docs/implementation/r00-gates.json";
import { privilegedMfaPilotEnabled } from "./privileged-mfa-pilot";

/**
 * R01.3D.3A -- deliberately dormant until governance, recovery and
 * cross-route authorization review are all approved.
 *
 * This gate is NOT a declaration that all privileged services already enforce
 * MFA. Direct financial, invitation and operational actions require separate
 * audit and integration before owner signoff can enable it.
 */
export function privilegedMfaEnforcementEnabled(): boolean {
  const required = ["R00-D01", "R00-D04", "R00-D09"];
  const approved = required.every(id => {
    const gate = decisions.gates.find(item => item.id === id) as
      | { status: string; decision_record_ref: unknown; approved_by: unknown; approved_at: unknown }
      | undefined;
    return gate?.status === "APPROVED" &&
      typeof gate.decision_record_ref === "string" && gate.decision_record_ref.trim().length > 0 &&
      typeof gate.approved_by === "string" && gate.approved_by.trim().length > 0 &&
      typeof gate.approved_at === "string" && gate.approved_at.trim().length > 0;
  });

  return approved &&
    privilegedMfaPilotEnabled() &&
    process.env.ADMIN_MFA_ENFORCEMENT_ENABLED === "true" &&
    process.env.ADMIN_MFA_RECOVERY_SIGNOFF === "true" &&
    process.env.ADMIN_MFA_ALL_ENTRYPOINTS_SIGNOFF === "true";
}

type MfaReader = Pick<
  SupabaseClient["auth"]["mfa"],
  "getAuthenticatorAssuranceLevel" | "listFactors"
>;
export type PrivilegedMfaDecision =
  | Readonly<{ allowed: true; evidence: "CURRENT_AAL2_AND_VERIFIED_TOTP" }>
  | Readonly<{ allowed: false; reason: "AAL2_REQUIRED" | "PROVIDER_UNAVAILABLE" | "NO_VERIFIED_TOTP" }>;

/**
 * Server-only, present-tense check. Never use user_metadata, an arbitrary
 * client-supplied factorId, stale dashboard counts, or cached JWT role claims.
 *
 * AAL2 alone is not sufficient when factor ownership cannot be verified.
 */
export async function inspectCurrentPrivilegedMfaAccess(mfa: MfaReader): Promise<PrivilegedMfaDecision> {
  const [assurance, factors] = await Promise.allSettled([
    mfa.getAuthenticatorAssuranceLevel(),
    mfa.listFactors(),
  ]);

  if (assurance.status !== "fulfilled" || assurance.value.error ||
      !assurance.value.data ||
      factors.status !== "fulfilled" || factors.value.error ||
      !Array.isArray(factors.value.data?.all))
    return { allowed: false, reason: "PROVIDER_UNAVAILABLE" };

  if (assurance.value.data.currentLevel !== "aal2")
    return { allowed: false, reason: "AAL2_REQUIRED" };

  const verifiedTotp = factors.value.data.all.some(factor =>
    factor.factor_type === "totp" && factor.status === "verified");
  if (!verifiedTotp)
    return { allowed: false, reason: "NO_VERIFIED_TOTP" };

  return { allowed: true, evidence: "CURRENT_AAL2_AND_VERIFIED_TOTP" };
}
