import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * R01.3D.1 — Read-only MFA readiness for the CURRENT verified session.
 *
 * Provider assurance and verified factor count are observations, not
 * authorization: NEVER use this result in an Admin/finance guard, grant flow,
 * privilege assignment, recovery or payment decision. The mandatory privileged
 * MFA enforcement policy is still gated by R00-D04 (and R00-D01/D09).
 *
 * Do not expose factor IDs, phone numbers, TOTP secrets, QR codes, or raw Auth
 * responses. An unavailable provider check must never be reported as passed.
 */
export type PrivilegedMfaReadiness = Readonly<{
  kind: "READ_ONLY_SESSION_OBSERVATION";
  currentLevel: "aal1" | "aal2" | "unknown";
  nextLevel: "aal1" | "aal2" | "unknown";
  verifiedFactorCount: number | null;
  assessment: "SECOND_FACTOR_OBSERVED" | "SECOND_FACTOR_NOT_OBSERVED" | "UNKNOWN";
  privilegedMfaPolicyEnforced: false;
}>;

type MfaReader = Pick<
  SupabaseClient["auth"]["mfa"],
  "getAuthenticatorAssuranceLevel" | "listFactors"
>;

function level(value: unknown): "aal1" | "aal2" | "unknown" {
  if (value === "aal1" || value === "aal2") return value;
  return "unknown";
}

export async function inspectCurrentPrivilegedMfaReadiness(
  mfa: MfaReader,
): Promise<PrivilegedMfaReadiness> {
  const [assurance, factors] = await Promise.allSettled([
    mfa.getAuthenticatorAssuranceLevel(),
    mfa.listFactors(),
  ]);
  const assuranceData = assurance.status === "fulfilled" && !assurance.value.error
    ? assurance.value.data : null;
  const factorsData = factors.status === "fulfilled" && !factors.value.error
    ? factors.value.data : null;
  const currentLevel = level(assuranceData?.currentLevel);
  const nextLevel = level(assuranceData?.nextLevel);
  const verifiedFactorCount = Array.isArray(factorsData?.all)
    ? factorsData.all.filter(factor => factor.status === "verified").length
    : null;

  const assessment =
    currentLevel === "unknown" || verifiedFactorCount === null
      ? "UNKNOWN"
      : currentLevel === "aal2" && verifiedFactorCount > 0
        ? "SECOND_FACTOR_OBSERVED"
        : "SECOND_FACTOR_NOT_OBSERVED";

  return {
    kind: "READ_ONLY_SESSION_OBSERVATION",
    currentLevel,
    nextLevel,
    verifiedFactorCount,
    assessment,
    privilegedMfaPolicyEnforced: false,
  };
}
