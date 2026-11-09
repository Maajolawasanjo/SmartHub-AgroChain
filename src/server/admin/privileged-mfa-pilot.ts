import "server-only";
import decisions from "../../../docs/implementation/r00-gates.json";

/**
 * R01.3D.2 release contract. A deployment variable alone CANNOT activate
 * privileged MFA enrollment. The owner must first record a formal approval
 * of R00-D04 in the protected decision ledger and update this repository gate.
 *
 * A pilot is NOT mandatory AAL2 enforcement; release security sign-off is
 * separately required for privileged pages, APIs, MFA recovery and finance.
 */
export function privilegedMfaPilotEnabled(): boolean {
  const gate = decisions.gates.find(value => value.id === "R00-D04") as\n    | { status: string; decision_record_ref: unknown; approved_by: unknown; approved_at: unknown }\n    | undefined;
  return (
    gate?.status === "APPROVED" &&
    typeof gate.decision_record_ref === "string" &&
    gate.decision_record_ref.trim().length > 0 &&
    typeof gate.approved_by === "string" &&
    gate.approved_by.trim().length > 0 &&
    typeof gate.approved_at === "string" &&
    gate.approved_at.trim().length > 0 &&
    process.env.ADMIN_MFA_PILOT_ENABLED === "true"
  );
}

/**
 * Never let the caller trust an arbitrary factor ID. This matcher only accepts
 * a factor already listed by Supabase Auth for the current signed-in user.
 */
export function ownTotpFactor(
  all: readonly { id: string; status?: string; factor_type?: string }[],
  factorId: string,
  state: "verified" | "unverified",
): boolean {
  return all.some(factor => (
    factor.id === factorId &&
    factor.status === state &&
    factor.factor_type === "totp"
  ));
}
