# Phase 07 — Operations Verification and Supply Quality Controls

## Scope and source hierarchy

The SmartHub V2 roadmap requires assigned Operations verification queues, evidence review, recorded decisions and histories, quantity/grade/unit validation, and safe concurrent updates. The underlying PRD separates contact verification, farmer verification, Field Agent report acceptance and physical supply approval. These are **not** the same state. This phase extends the existing farmer, supply and Phase 05 Field Agent records; it does not create a separate stock ledger, quote, order or payment.

## Delivered

- `/operations/verification` and `/operations/supply`: actual database-backed queues with status filters, bounded search and 25-record pagination; reviewer assignment shown on each row.
- Dedicated detail routes for farmer verification and supply inspection: source records, accepted/submitted field reports, links to authorized private evidence, decision histories and assessment provenance.
- Claim-before-decision: Operations can claim unassigned pending cases. A second reviewer cannot silently take over. Only a Super Admin may reassign an already-claimed case, with a mandatory reason and audit event. Assignment is unique by case kind and subject ID.
- Farmer approval: requires active Operations permission, claimed case, pending state, at least one farm, and an **accepted** Field Agent verification/farm assessment report with READY evidence for **every** registered farm. Rejection/information requests remain possible when evidence is missing.
- Supply approval: requires a verified farmer, an accepted crop/production field report with READY private evidence for the **same farmer and farm**, an independently entered physical quantity and unit matching the farmer declaration, condition assessment, valid packaging and an optional catalog specification belonging to the declared commodity. Discrepancies are returned to the farmer for correction; they are not silently converted or adjusted.
- Every review decision is atomic with the status update, review event, audit record and (on supply approval) a structured inspection assessment. Guarded updates reject stale or already-reviewed cases. Reviewer identity and active permissions are rechecked within the transaction.
- Database migration for `operations_review_assignments` and `supply_inspection_assessments`, including constraints, indexes, RLS and Data API revocation.

## Policy boundaries and explicit non-features

- An accepted field report is evidence only; it never automatically verifies a farmer or approves stock.
- Supply approval makes a declaration eligible for *future* Operations consideration. It does not certify a grade, publish live stock, reserve inventory, promise a price or create a commercial obligation.
- Catalog specifications are optional **observed** attributes, not automatic quality certificates. No unsupported grading taxonomy is invented.
- One Operations reviewer claims and decides each case. The Field Agent who submitted a report cannot approve their own report. Any further two-person financial/commercial approval rules require client authorization; do not infer them.
- This phase deliberately has no bulk approval action: mass updates without evidence-by-case checks would violate the review gate.
- The new assignment table is polymorphic by `(kind,subjectId)`; the application locks and checks the underlying case before assigning, while database foreign keys protect the actor identities. A future data-maintenance task may add a referential cleanup policy if records can ever be deleted.
- No Supabase project or credentials are configured; migration is **not applied**. Database concurrency, RLS and private-storage tests need a dedicated staging environment.

## Deployment and acceptance gates

1. Apply all migrations in order to a dedicated staging database, including `20261104010000_operations_review_controls`.
2. Verify authenticated routes with real Supabase sessions for Operations, Super Admin, Farmer and Field Agent. Check suspended-account and role-permission revocation mid-session.
3. Create genuine test farmers, farms, Field Agent assignments, accepted reports and READY private evidence. Verify only accepted, farm-matched reports can support approval.
4. Test two reviewers claiming the same case concurrently; one wins. Test a Super Admin reassignment with reason, and confirm the original reviewer can no longer decide.
5. Test approval concurrent with farmer withdrawal/resubmission and evidence changes. Verify only one review event/assessment is committed for a successful decision.
6. Test invalid units, quantities, commodity specification IDs, missing or cross-farm evidence, incomplete farmer verification, and missing reviewer acknowledgment.
7. Verify authorized signed evidence downloads and ensure no public bucket or Data API exposure.
8. Run Prisma generate/validate, typecheck, all tests, production build, browser/mobile E2E and a security review before marking the phase staging-verified.
