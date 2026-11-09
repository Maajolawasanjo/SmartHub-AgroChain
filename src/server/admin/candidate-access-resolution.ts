import "server-only";

/**
 * R01.3B OFFLINE CONTRACT — NOT A PRODUCTION AUTHORIZATION ENGINE.
 *
 * Draft a fail-closed interpretation of the approved Team & Access integration
 * rules for regression tests and schema planning. Neither this module nor its
 * fixtures are authorized to grant a live permission. Do not import it into an
 * API route, page guard, server action, Supabase policy or payment service.
 *
 * Activating a new grant system remains gated by R00-D01/D04/D09.
 */
export const CANDIDATE_MODULES = [
  "overview", "farmers-buyers", "field-operations", "products-supply",
  "sourcing-quotes", "orders-fulfilment", "finance", "support-disputes",
  "content-communications", "reports-audit", "team-access", "system-settings",
] as const;

export const CANDIDATE_ACTIONS = [
  "view", "create", "edit", "approve", "delete", "export", "manage",
] as const;

export type CandidateModule = typeof CANDIDATE_MODULES[number];
export type CandidateAction = typeof CANDIDATE_ACTIONS[number];
export type CandidateCapability = `${CandidateModule}:${CandidateAction}`;

export type CandidateScope =
  | Readonly<{ kind: "COMPANY" }>
  | Readonly<{ kind: "OWN_RECORD" }>
  | Readonly<{ kind: "ASSIGNED_RECORD" }>
  | Readonly<{ kind: "DEPARTMENT"; departmentId: string }>
  | Readonly<{ kind: "STATE"; stateCode: string }>
  | Readonly<{ kind: "LOCAL_GOVERNMENT"; stateCode: string; lgaCode: string }>
  | Readonly<{ kind: "OPERATIONAL_AREA"; areaId: string }>
  | Readonly<{ kind: "PROJECT"; projectId: string }>
  | Readonly<{ kind: "BUSINESS_RELATIONSHIP"; relationshipId: string }>;

export type CandidateRecord = Readonly<{
  id: string;
  ownerId?: string;
  assignedPrincipalIds?: readonly string[];
  departmentId?: string;
  stateCode?: string;
  lgaCode?: string;
  areaId?: string;
  projectId?: string;
  relationshipId?: string;
}>;

export type CandidateIdentity = Readonly<{
  id: string;
  authenticated: boolean;
  providerEmailVerified: boolean;
  accountStatus: string;
  staffDirectoryLinked: boolean;
  engagementEligible: boolean;
}>;

export type CandidateEvidence = Readonly<{
  principalId: string;
  sourceId: string;
  sourceKind: "ROLE_TEMPLATE" | "INDIVIDUAL_GRANT" | "INDIVIDUAL_RESTRICTION";
  capability: string;
  approvalReference: string;
  approvedById: string;
  status: string;
  effectiveFromMs: number;
  expiresAtMs: number | null;
  scope: CandidateScope;
  roleVersion?: number;
}>;

export type CandidateRequest = Readonly<{
  identity: CandidateIdentity;
  capability: string;
  record: CandidateRecord;
  evidence: readonly CandidateEvidence[];
  atMs: number;
  separationOfDutiesReviewed: boolean;
  unresolvedConflict: boolean;
}>;

export type CandidateDecision =
  | Readonly<{
      allowed: true;
      kind: "OFFLINE_SIMULATION_ONLY";
      sourceIds: readonly string[];
    }>
  | Readonly<{
      allowed: false;
      kind: "OFFLINE_SIMULATION_ONLY";
      reason:
        | "ACTOR_NOT_ELIGIBLE"
        | "INVALID_RESOURCE_OR_CLOCK"
        | "UNKNOWN_CAPABILITY"
        | "PRIVILEGED_POLICY_NOT_APPROVED"
        | "SEPARATION_REVIEW_MISSING"
        | "UNRESOLVED_CONFLICT"
        | "INDIVIDUAL_RESTRICTION"
        | "NO_VALID_SCOPED_PERMISSION";
    }>;

const deny = (reason: Extract<CandidateDecision, { allowed: false }>["reason"]): CandidateDecision =>
  { return { allowed: false, kind: "OFFLINE_SIMULATION_ONLY", reason }; };

const validText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function candidateScopeMatches(
  scope: CandidateScope,
  record: CandidateRecord,
  principalId: string,
): boolean {
  if (!scope || !record || !validText(record.id) || !validText(principalId)) return false;
  switch (scope.kind) {
    case "COMPANY":
      return true; // Only an explicitly approved entitlement can carry this scope.
    case "OWN_RECORD":
      return record.ownerId === principalId;
    case "ASSIGNED_RECORD":
      return Array.isArray(record.assignedPrincipalIds) && record.assignedPrincipalIds.includes(principalId);
    case "DEPARTMENT":
      return validText(scope.departmentId) && scope.departmentId === record.departmentId;
    case "STATE":
      return validText(scope.stateCode) && scope.stateCode === record.stateCode;
    case "LOCAL_GOVERNMENT":
      return validText(scope.stateCode) && validText(scope.lgaCode) &&
        scope.stateCode === record.stateCode && scope.lgaCode === record.lgaCode;
    case "OPERATIONAL_AREA":
      return validText(scope.areaId) && scope.areaId === record.areaId;
    case "PROJECT":
      return validText(scope.projectId) && scope.projectId === record.projectId;
    case "BUSINESS_RELATIONSHIP":
      return validText(scope.relationshipId) && scope.relationshipId === record.relationshipId;
    default:
      return false;
  }
}

function validEvidence(
  evidence: CandidateEvidence,
  request: CandidateRequest,
): boolean {
  if (!evidence || evidence.principalId !== request.identity.id ||
      evidence.capability !== request.capability ||
      !validText(evidence.sourceId) || !validText(evidence.approvalReference) ||
      !validText(evidence.approvedById) || evidence.approvedById === evidence.principalId ||
      evidence.status !== "ACTIVE" ||
      !Number.isFinite(evidence.effectiveFromMs) ||
      evidence.effectiveFromMs > request.atMs ||
      (evidence.expiresAtMs !== null &&
        (!Number.isFinite(evidence.expiresAtMs) || evidence.expiresAtMs <= request.atMs ||
          evidence.expiresAtMs <= evidence.effectiveFromMs)) ||
      !candidateScopeMatches(evidence.scope, request.record, request.identity.id)) return false;
  if (evidence.sourceKind === "ROLE_TEMPLATE")
    return Number.isInteger(evidence.roleVersion) && (evidence.roleVersion ?? 0) > 0;
  return evidence.sourceKind === "INDIVIDUAL_GRANT" ||
    evidence.sourceKind === "INDIVIDUAL_RESTRICTION";
}

function declaredCapability(capability: string): { module: CandidateModule; action: CandidateAction } | null {
  if (typeof capability !== "string") return null;
  const parts = capability.split(":");
  if (parts.length !== 2 ||
      !CANDIDATE_MODULES.includes(parts[0] as CandidateModule) ||
      !CANDIDATE_ACTIONS.includes(parts[1] as CandidateAction)) return null;
  return { module: parts[0] as CandidateModule, action: parts[1] as CandidateAction };
}

/**
 * OFFLINE ONLY. The input represents hypothetical server-authorized data,
 * not browser input or an alternative to Supabase/Auth/Prisma authorization.
 * No caller from a deployed service may treat an "allowed" result as a grant.
 */
export function simulateCandidateAccess(request: CandidateRequest): CandidateDecision {
  const actor = request?.identity;
  if (!actor || !validText(actor.id) || actor.authenticated !== true ||
      actor.providerEmailVerified !== true || actor.accountStatus !== "ACTIVE" ||
      actor.staffDirectoryLinked !== true || actor.engagementEligible !== true)
    return deny("ACTOR_NOT_ELIGIBLE");
  if (!request.record || !validText(request.record.id) || !Number.isFinite(request.atMs))
    return deny("INVALID_RESOURCE_OR_CLOCK");

  const parsed = declaredCapability(request.capability);
  if (!parsed) return deny("UNKNOWN_CAPABILITY");

  // Until R00-D04/D09 are approved, there is deliberately NO candidate allow
  // path for financial or privileged approval/access-governance actions.
  if (parsed.module === "finance" || parsed.module === "team-access" ||
      parsed.module === "system-settings" || parsed.action === "approve")
    return deny("PRIVILEGED_POLICY_NOT_APPROVED");

  if (request.separationOfDutiesReviewed !== true) return deny("SEPARATION_REVIEW_MISSING");
  if (request.unresolvedConflict !== false) return deny("UNRESOLVED_CONFLICT");

  const sources = Array.isArray(request.evidence)
    ? request.evidence.filter(item => validEvidence(item, request))
    : [];
  if (sources.some(item => item.sourceKind === "INDIVIDUAL_RESTRICTION"))
    return deny("INDIVIDUAL_RESTRICTION");

  const authorizingSources = [...new Set(sources.filter(item =>
    item.sourceKind === "ROLE_TEMPLATE" || item.sourceKind === "INDIVIDUAL_GRANT"
  ).map(item => item.sourceId))];
  if (authorizingSources.length === 0) return deny("NO_VALID_SCOPED_PERMISSION");
  return { allowed: true, kind: "OFFLINE_SIMULATION_ONLY", sourceIds: authorizingSources };
}
