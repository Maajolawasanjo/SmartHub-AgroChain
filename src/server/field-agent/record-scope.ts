import "server-only";
import { PublicError } from "@/server/auth/http";
import { getPrisma } from "@/server/db/prisma";
import { assertFieldRecordId } from "./validators";

/**
 * R01.3C.1: enforce the CURRENT, already-provisioned Field Agent state scope
 * against authoritative DB records in a single SELECT.
 *
 * The actor ID comes from verified server-side Auth, never from request input.
 * This does not create departmental roles, individual overrides or new grants.
 * The approved future effective-access policy is still gated by R00-D01/D04/D09.
 */
export async function requireCurrentAgentScopedVisit(visitId: string, agentId: string) {
  const scopedVisitId = assertFieldRecordId(visitId);
  const currentAgentId = assertFieldRecordId(agentId);
  const matches = await getPrisma().$queryRaw<Array<{ id: string }>>`
    SELECT visit."id"
      FROM "field_visits" AS visit
      JOIN "farms" AS farm ON farm."id" = visit."farmId"
      JOIN "app_accounts" AS actor ON actor."id" = visit."fieldAgentId"
     WHERE visit."id" = ${scopedVisitId}::uuid
       AND visit."fieldAgentId" = ${currentAgentId}::uuid
       AND actor."role" = 'FIELD_AGENT'
       AND actor."status" = 'ACTIVE'
       AND EXISTS (
         SELECT 1
           FROM "field_agent_assignments" AS assignment
          WHERE assignment."fieldAgentId" = actor."id"
            AND assignment."state" = farm."state"
            AND assignment."active" = TRUE
       )
     LIMIT 1
  `;
  if (matches.length !== 1)
    throw new PublicError(404, "Field visit not found in your active assignment scope.");
  return { id: matches[0].id };
}

/**
 * Bind evidence ownership, readiness, actor eligibility and active state
 * assignment to ONE database read. Never sign a storage path obtained in a
 * separate unrestricted query after an earlier access check.
 *
 * A signed URL remains usable until its storage expiry; revocation of already
 * issued URLs is a separate acceptance requirement for future privileged data.
 */
export async function findCurrentAgentReadyEvidencePath(
  visitId: string,
  evidenceId: string,
  agentId: string,
): Promise<string | null> {
  const scopedVisitId = assertFieldRecordId(visitId);
  const scopedEvidenceId = assertFieldRecordId(evidenceId);
  const currentAgentId = assertFieldRecordId(agentId);
  const matches = await getPrisma().$queryRaw<Array<{ objectPath: string }>>`
    SELECT evidence."objectPath"
      FROM "field_visit_evidence" AS evidence
      JOIN "field_visits" AS visit ON visit."id" = evidence."visitId"
      JOIN "farms" AS farm ON farm."id" = visit."farmId"
      JOIN "app_accounts" AS actor ON actor."id" = visit."fieldAgentId"
     WHERE evidence."id" = ${scopedEvidenceId}::uuid
       AND evidence."visitId" = ${scopedVisitId}::uuid
       AND evidence."status" = 'READY'
       AND visit."fieldAgentId" = ${currentAgentId}::uuid
       AND actor."role" = 'FIELD_AGENT'
       AND actor."status" = 'ACTIVE'
       AND EXISTS (
         SELECT 1
           FROM "field_agent_assignments" AS assignment
          WHERE assignment."fieldAgentId" = actor."id"
            AND assignment."state" = farm."state"
            AND assignment."active" = TRUE
       )
     LIMIT 1
  `;
  return matches.length === 1 ? matches[0].objectPath : null;
}
