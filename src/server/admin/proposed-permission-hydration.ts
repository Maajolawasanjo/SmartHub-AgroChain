import "server-only";

/**
 * R01.3C.2 — DORMANT persistence-boundary contract.
 *
 * These rows are hypothetical database records, NEVER API/browser claims.
 * No live code imports this module. This is a defensive hydration layer for
 * the future approved permission store, not an activation of new privileges.
 * R00-D01, R00-D04 and R00-D09 remain mandatory release gates.
 */
export const PROPOSED_ACCESS_STORAGE_STATE = "NOT_MIGRATED_NOT_ACTIVE" as const;

const MODULES = [
  "overview", "farmers-buyers", "field-operations", "products-supply",
  "sourcing-quotes", "orders-fulfilment", "finance", "support-disputes",
  "content-communications", "reports-audit", "team-access", "system-settings",
] as const;
const ACTIONS = ["view", "create", "edit", "approve", "delete", "export", "manage"] as const;

export type StoredScope =
  | Readonly<{ kind: "COMPANY" }>
  | Readonly<{ kind: "OWN_RECORD" }>
  | Readonly<{ kind: "ASSIGNED_RECORD" }>
  | Readonly<{ kind: "DEPARTMENT"; departmentId: string }>
  | Readonly<{ kind: "STATE"; stateCode: string }>
  | Readonly<{ kind: "LOCAL_GOVERNMENT"; stateCode: string; lgaCode: string }>
  | Readonly<{ kind: "OPERATIONAL_AREA"; areaId: string }>
  | Readonly<{ kind: "PROJECT"; projectId: string }>
  | Readonly<{ kind: "BUSINESS_RELATIONSHIP"; relationshipId: string }>;

export type StoredPermissionEvidence = Readonly<{
  principalId: string;
  sourceId: string;
  sourceKind: "ROLE_TEMPLATE" | "INDIVIDUAL_GRANT" | "INDIVIDUAL_RESTRICTION";
  capability: string;
  approvalReference: string;
  approvedById: string;
  status: "ACTIVE";
  effectiveFromMs: number;
  expiresAtMs: number | null;
  scope: StoredScope;
  roleVersion?: number;
}>;

export type HydrationResult =
  | Readonly<{ ok: true; kind: "DORMANT_PERSISTENCE_PROPOSAL"; evidence: readonly StoredPermissionEvidence[] }>
  | Readonly<{ ok: false; kind: "DORMANT_PERSISTENCE_PROPOSAL"; reason: "INVALID_CONTEXT" | "MALFORMED_ROW" | "UNAPPROVED_PRIVILEGED_CAPABILITY" | "CONFLICTING_SOURCE" }>;

const deny = (reason: Extract<HydrationResult, {ok: false}>["reason"]): HydrationResult =>
  ({ ok: false, kind: "DORMANT_PERSISTENCE_PROPOSAL", reason });

const str = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 256;
const row = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function validScope(value: unknown): value is StoredScope {
  if (!row(value)) return false;
  switch (value.kind) {
    case "COMPANY":
    case "OWN_RECORD":
    case "ASSIGNED_RECORD":
      return Object.keys(value).length === 1;
    case "DEPARTMENT":
      return Object.keys(value).length === 2 && str(value.departmentId);
    case "STATE":
      return Object.keys(value).length === 2 && str(value.stateCode);
    case "LOCAL_GOVERNMENT":
      return Object.keys(value).length === 3 && str(value.stateCode) && str(value.lgaCode);
    case "OPERATIONAL_AREA":
      return Object.keys(value).length === 2 && str(value.areaId);
    case "PROJECT":
      return Object.keys(value).length === 2 && str(value.projectId);
    case "BUSINESS_RELATIONSHIP":
      return Object.keys(value).length === 2 && str(value.relationshipId);
    default:
      return false;
  }
}

function knownCapability(value: unknown): value is string {
  if (!str(value)) return false;
  const parts = value.split(":");
  return parts.length === 2 &&
    MODULES.includes(parts[0] as typeof MODULES[number]) &&
    ACTIONS.includes(parts[1] as typeof ACTIONS[number]);
}

function privileged(value: string): boolean {
  const [module, action] = value.split(":");
  return module === "finance" || module === "team-access" ||
    module === "system-settings" || action === "approve";
}

/**
 * Normalize a future DB snapshot before passing it to the offline permission
 * simulator. Fails closed on malformed active records or duplicate source IDs.
 *
 * The repository that eventually calls this must obtain principalId from
 * verified Supabase identity, account status and Staff Directory eligibility.
 * That repository does not yet exist. The result cannot authorize a request.
 */
export function hydrateProposedPermissionRows(input: {
  principalId: string;
  atMs: number;
  rows: unknown;
}): HydrationResult {
  if (!input || !str(input.principalId) || !finite(input.atMs) || !Array.isArray(input.rows))
    return deny("INVALID_CONTEXT");

  const result: StoredPermissionEvidence[] = [];
  const sourceIds = new Set<string>();

  for (const raw of input.rows) {
    if (!row(raw) || !str(raw.sourceId) || !str(raw.principalId) ||
        raw.principalId !== input.principalId || !knownCapability(raw.capability) ||
        !["ROLE_TEMPLATE", "INDIVIDUAL_GRANT", "INDIVIDUAL_RESTRICTION"].includes(String(raw.sourceKind)) ||
        !["REQUESTED", "APPROVED", "PROVISIONING", "ACTIVE", "REVOKED", "SUSPENDED", "EXPIRED", "REJECTED"].includes(String(raw.status)))
      return deny("MALFORMED_ROW");

    // Stored inactive/history rows MUST NOT silently reactivate on hydration.
    if (raw.status !== "ACTIVE") continue;

    // A record is authoritative only after the separate provisioning step.
    if (raw.provisioningStatus !== "PROVISIONED" ||
        !str(raw.approvalReference) || !str(raw.businessReason) ||
        !str(raw.requestedById) || !str(raw.approvedById) ||
        raw.approvedById === input.principalId ||
        raw.requestedById === input.principalId ||
        raw.approvedById === raw.requestedById ||
        !finite(raw.effectiveFromMs) ||
        raw.effectiveFromMs > input.atMs ||
        (raw.expiresAtMs !== null &&
          (!finite(raw.expiresAtMs) || raw.expiresAtMs <= raw.effectiveFromMs)) ||
        !validScope(raw.scope)) return deny("MALFORMED_ROW");

    if (raw.expiresAtMs !== null && (raw.expiresAtMs as number) <= input.atMs)
      continue;

    if (raw.sourceKind === "ROLE_TEMPLATE" &&
        (!Number.isInteger(raw.roleVersion) || (raw.roleVersion as number) < 1))
      return deny("MALFORMED_ROW");
    if (raw.sourceKind !== "ROLE_TEMPLATE" && raw.roleVersion !== null && raw.roleVersion !== undefined)
      return deny("MALFORMED_ROW");

    // Until independent finance/MFA/role-governance approvals are settled, no
    // proposed privileged capability is allowed even in candidate evidence.
    if (privileged(raw.capability as string)) return deny("UNAPPROVED_PRIVILEGED_CAPABILITY");

    if (sourceIds.has(raw.sourceId)) return deny("CONFLICTING_SOURCE");
    sourceIds.add(raw.sourceId);

    result.push({
      principalId: raw.principalId,
      sourceId: raw.sourceId,
      sourceKind: raw.sourceKind as StoredPermissionEvidence["sourceKind"],
      capability: raw.capability,
      approvalReference: raw.approvalReference as string,
      approvedById: raw.approvedById as string,
      status: "ACTIVE",
      effectiveFromMs: raw.effectiveFromMs,
      expiresAtMs: raw.expiresAtMs as number | null,
      scope: raw.scope,
      ...(raw.sourceKind === "ROLE_TEMPLATE" ? {roleVersion: raw.roleVersion as number} : {}),
    } as StoredPermissionEvidence);
  }

  return { ok: true, kind: "DORMANT_PERSISTENCE_PROPOSAL", evidence: result };
}
