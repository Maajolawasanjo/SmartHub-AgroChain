import "server-only";

/**
 * R01.3D.3A — NON-EXECUTABLE recovery evidence contract.
 *
 * All fields in this simulator must come from separately authenticated,
 * authoritative records in a future reviewed workflow, never from a browser.
 * Passing these preconditions must NEVER remove a factor or unblock a login.
 * A privileged recovery workflow cannot go live until R00-D04 approval,
 * designated independent officers, durable audit and Supabase integration tests.
 */
export type RecoveryReview = Readonly<{
  requestId: string;
  subjectAccountId: string;
  requestedById: string;
  incidentReference: string;
  businessReason: string;
  identityReverificationStatus: "VERIFIED" | "PENDING" | "REJECTED";
  issuedAtMs: number;
  expiresAtMs: number;
  currentTimeMs: number;
  lifecycleStatus: "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "EXECUTED" | "CANCELLED";
  approvals: readonly Readonly<{
    approverAccountId: string;
    designatedRecoveryOfficer: boolean;
    independentlyAuthenticated: boolean;
    decision: "APPROVE" | "REJECT";
    decisionAtMs: number;
  }>[];
}>;

export type RecoveryReviewOutcome = Readonly<{
  kind: "HUMAN_REVIEW_PRECONDITIONS_ONLY";
  candidateForApprovedWorkflow: boolean;
  reason:
    | "REVIEW_REQUIRED"
    | "INVALID_EVIDENCE"
    | "OUTSIDE_REVIEW_WINDOW"
    | "IDENTITY_NOT_REVERIFIED"
    | "NOT_UNDER_REVIEW"
    | "REJECTED"
    | "INSUFFICIENT_INDEPENDENT_APPROVALS"
    | "TWO_PERSON_PRECONDITIONS_OBSERVED";
}>;

const text = (value: unknown, min = 1): value is string =>
  typeof value === "string" && value.trim().length >= min && value.length <= 2000;

export function evaluateRecoveryReviewPreconditions(input: RecoveryReview): RecoveryReviewOutcome {
  const result = (reason: RecoveryReviewOutcome["reason"], candidateForApprovedWorkflow = false): RecoveryReviewOutcome =>
    ({kind: "HUMAN_REVIEW_PRECONDITIONS_ONLY", candidateForApprovedWorkflow, reason});

  if (!input || !text(input.requestId) || !text(input.subjectAccountId) ||
      !text(input.requestedById) || !text(input.incidentReference, 8) ||
      !text(input.businessReason, 20) || !Array.isArray(input.approvals) ||
      !Number.isFinite(input.issuedAtMs) || !Number.isFinite(input.expiresAtMs) ||
      !Number.isFinite(input.currentTimeMs))
    return result("INVALID_EVIDENCE");

  if (input.expiresAtMs <= input.issuedAtMs ||
      input.currentTimeMs < input.issuedAtMs ||
      input.currentTimeMs >= input.expiresAtMs)
    return result("OUTSIDE_REVIEW_WINDOW");

  if (input.identityReverificationStatus !== "VERIFIED")
    return result("IDENTITY_NOT_REVERIFIED");

  if (input.lifecycleStatus === "REJECTED" ||
      input.approvals.some(item => item.decision === "REJECT"))
    return result("REJECTED");

  if (input.lifecycleStatus !== "UNDER_REVIEW")
    return result("NOT_UNDER_REVIEW");

  const independent = new Set<string>();
  for (const item of input.approvals) {
    if (!item || !text(item.approverAccountId) || !Number.isFinite(item.decisionAtMs) ||
        item.decisionAtMs < input.issuedAtMs || item.decisionAtMs > input.currentTimeMs ||
        item.designatedRecoveryOfficer !== true ||
        item.independentlyAuthenticated !== true ||
        item.decision !== "APPROVE" ||
        item.approverAccountId === input.subjectAccountId ||
        item.approverAccountId === input.requestedById)
      continue;
    independent.add(item.approverAccountId);
  }

  if (independent.size < 2)
    return result("INSUFFICIENT_INDEPENDENT_APPROVALS");

  // Never returns "authorized" or executes Supabase Auth actions. The future
  // workflow must still independently enforce privileges at execution time.
  return result("TWO_PERSON_PRECONDITIONS_OBSERVED", true);
}
