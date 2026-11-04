# Phase 09 — Buyer Sourcing Requests and Operations Demand Queue

## Source and workflow

Implementation follows `docs/implementation/MASTER_IMPLEMENTATION_ROADMAP_V2.md` P09 and the Buyer Portal Developer Specification. SmartHub acts as the **managed procurement intermediary**. An initial buyer request is **not** contingent on independent business verification, but does require the seven required business-profile fields and a verified authenticated buyer email. No buyer–farmer direct contact, stock reservation, pricing, official quote, order or payment is created.

**Implemented loop:** buyer saves incomplete draft → completes required business profile → submits validated one-to-five commodity requirements → Operations sees the same persisted request → assigned reviewer starts review → asks a specific question → buyer edits saved response draft and answers → request returns to Submitted → Operations resumes review → records sourcing assessment in progress or closes with rationale.

## Frontend

- `/dashboard/requests/new`: commodity-led request builder with optional published catalogue prefill, saved-specification template, saved delivery destination, 1–5 line items, manual unlisted commodity, variety/specification, quantity/unit, flexible quantity, bag packaging, quality notes, delivery location, required date, fulfilment preference and notes. Explicit Save Draft and Submit actions.
- `/dashboard/requests`: real organization-scoped, status-filtered and paginated request history.
- `/dashboard/requests/[id]`: reference, summary, status, recorded progress timeline, clarification questions/answers, permitted actions, cancellation before review.
- `/dashboard/requests/[id]/information`: draft editing and clarification response, with saved partial progress and explicit resubmission.
- `/dashboard`: real active request count and recent records; quotation, order and payment metrics remain unavailable rather than fabricated.
- `/dashboard/notifications`: organization-scoped, recorded request event feed. No claims of email/SMS/push delivery or read receipts.
- `/operations/requests` and `/operations/requests/[id]`: search, filter, pagination, reviewer claim/takeover, manual internal review target, status decisions, buyer context, submitted item details and recorded history.

## Backend and database

- `BuyerRequest`, `BuyerRequestLine`, `BuyerRequestEvent`, `BuyerRequestClarification`, `BuyerRequestAssignment` models; migration `20261104030000_buyer_requests`.
- Request references derive from generated UUIDs (`REQ-` plus 32 uppercase hex characters); unique index prevents duplicate references.
- `draftPayload` JSON stores validated but incomplete draft fields. Canonical lines are written only after a successful submission. Draft saves are not published to Operations.
- 30 open draft limit per organization; one to five line items at submission; quantity positive, ≤1,000,000,000 and ≤3 decimals; bag units require packaging description; required delivery state/city, fulfilment preference and non-past required date.
- Catalogue-linked items require a published active commodity and matching published type/specification. Unlisted commodities may be described manually and are explicitly flagged for Operations review.
- Mutations use Supabase-authenticated account context, verified email, server-derived membership, active role, account and organization row locks, request row lock, optimistic version check, conditional update, transaction-scoped audit events and status timeline. Buyer read and writes are always organization-scoped; VIEWER is read-only.
- Operations claim-before-decision. Reassignment to another reviewer requires Super Admin plus a recorded explanation. Status transition matrix is server-enforced: SUBMITTED→UNDER_REVIEW→MORE_INFO_REQUIRED→SUBMITTED or UNDER_REVIEW→SOURCING_IN_PROGRESS/CLOSED; SOURCING_IN_PROGRESS→CLOSED. Buyer cancellation only from DRAFT, SUBMITTED or MORE_INFO_REQUIRED. Exactly one outstanding clarification per request.
- Optional reviewer target (`dueAt`) is staff-entered, not an automatic SLA or a buyer-facing promise.
- All five new tables have RLS enabled and `anon`/`authenticated` Data API grants revoked. Application access is through server-authorized Prisma queries.

## Intentionally deferred

- Private request attachments until file-type/retention/security policy is approved.
- Quotations, matches, prices, reservations and buyer quote decisions (P10); order, payment and fulfilment workflows (later phases).
- Automated email/SMS/push notifications, guaranteed SLA clock, escalations, third-party logistics contracting, independent business verification decisions, and financial reporting.
- Request modifications after sourcing starts require an explicit future policy. No unapproved editing of in-flight sourcing or direct farmer messaging.

## Staging acceptance gate (not yet completed)

1. Apply all preceding Prisma migrations and `20261104030000_buyer_requests` to a dedicated staging Supabase PostgreSQL project with reviewed privileges and backups.
2. With real Buyer A and Buyer B, prove cross-organization request detail/clarification/cancel/submit access is denied (including guessed UUIDs and VIEWER membership). Verify suspended/unverified-email buyer is blocked.
3. Verify partial draft persists, successful submission creates canonical lines and unique reference, Operations queue sees the same request, review ownership works, question/resubmission appears to both roles, stale version is rejected, cancelled request cannot be reviewed.
4. Test simultaneous saves/claims, duplicate submits, one outstanding clarification constraint, stale state decisions, cap of 30 drafts, 5 line cap, invalid/unpublished type/specification, bag packaging, invalid date and location.
5. Verify no Data API access to sensitive request tables from public/normal Auth clients; run browser/mobile accessibility checks, error/empty/loading state checks and full Next.js CI.

**Status:** Code implementation and automated CI pending; not deployed or staging-verified.
