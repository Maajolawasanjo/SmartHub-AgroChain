# Phase 10 — Managed matching, farmer opportunities and governed quotations

**Branch**: feat/phase-10-matching-quotes (stacked on Phase 09 PR #14). **Readiness**: code implementation candidate pending CI, migration, staging and business/legal sign-off. Not deployed, not merged.

## Workflow
1. Operations first claims a Phase 09 request and moves it to SOURCING_IN_PROGRESS. Unsubmitted requests, unclassified manual commodities, and unapproved supplies cannot be matched.
2. An assigned Operations reviewer selects a buyer request line and an evidence-backed, verified farmer's approved supply, with matching commodity and unit. Proposed quantity cannot exceed requested, farmer-declared, or latest observed quantity. A requested grade must match the current recorded inspection.
3. Operations invites the farmer. The invitation appears only in that farmer's portal. The farmer can express interest or decline. This neither reserves stock nor accepts an order. Buyer information and farmer contact details are not shared across parties.
4. A quote builder requires one interested, eligible candidate per request line and an explicit NGN unit price per line, commercial terms, and expiry. It rejects overcommitment *within the same quote* of a single supplier declaration, but **does not establish stock availability across quotations**.
5. Operations saves a draft and submits for approval. Only Super Admin can approve or return it; the author cannot approve their own revision. Any rejected/revised version is historically preserved. Issue requires prior approval, current source eligibility and validity.
6. Only the owning buyer organization's OWNER can accept or decline an issued, unexpired quote. Buyer can see terms, unit prices and totals but not internal matching/supplier identity. The decision is recorded with an audit event. Accepted quote ≠ order, payment, stock reservation or guaranteed fulfilment.

## Implemented
- Prisma enums, 6 tables, constraints, foreign keys, unique keys and indexes, RLS enabled and Data API grants revoked.
- Backend guards use real Supabase-authenticated server identity and verified active roles, organization scoping, assigned Operations reviewer, farmer ownership, optimistic quote version checks and serializable database transactions.
- Routes for candidate creation, farmer invitation/response, quote draft, approval/rejection/issue/expiry, buyer accept/decline.
- UI: Operations matching workspace and case, farmer opportunities, Operations quotation detail/history, Super Admin approval queue, buyer quote list/detail and owner decision.
- Revisions carry explicit terms and financial lines. Historical issued revisions and approval actions remain in the database.
- Structural/contract regression tests.

## Security and commercial boundaries
- Supplier identity and details are internal to Operations/Super Admin. Buyer quotation pages never join supplier records.
- Quoted supply is **not reserved**. P11 must implement lots and concurrency-safe reservations before order confirmation, with rechecks to prevent over-selling.
- No autonomous pricing, buyer–farmer direct trading, official stock inventory quantity, payment obligation, payment capture, financial receipt or supplier settlement.
- Unit conversion, mixed-spec grading, manually unlisted commodities, split-line sourcing, cross-quote simultaneous availability and alternative price/fee/tax terms require approved handling before release.
- Only NGN quotes are enabled. Tax, legal seller-of-record, approvals delegation, cancellation/refunds and liability policies require client confirmation. There is no claim of commercial readiness until approved.
- Quote validity is bounded in code (at least one hour ahead, no more than 30 days); adjust only after client policy review.
- API routes enforce same-origin writes, validation, actor status and server-derived record authorization. The TypeScript UI does not confer permissions.

## Staging acceptance checklist (not yet verified)
1. Apply P00–P09 migrations followed by P10 on a dedicated Supabase staging project. Verify Prisma generation/validation, compile, build and CI.
2. With Farmer A/B, Buyer A/B, Operations assigned/unassigned and Super Admin, prove cross-organization, cross-farmer, draft/private quote, spoofed UUID, suspended accounts and VIEWER accesses are denied.
3. Prove one complete end-to-end route: approved inspected supply -> claimed buyer demand -> matching candidate -> invitation -> farmer interest -> quote draft -> independent approval -> issuance -> buyer decision -> audit history, without creating an order/payment/reservation.
4. Verify failed or stale candidate, mixed unit, expired quote, repeated decision, concurrent submissions, duplicate match, duplicate revision, reassigned reviewer and changed supply assessment are safely rejected or require recovery.
5. Verify private data filtering, mobile accessibility, UI failure/retry states, and correct browser/auth redirects.
6. Obtain confirmed commercial policy and legal review before enabling production issuance/acceptance.

**Future**: Phase 11 implements confirmed order lifecycle, supply lots, reservations and stock movements. It must not infer a valid reservation from an approved match or accepted quotation.

## Integration hardening
- Phase 09 Operations cannot close a sourcing request while a quote is pending approval, approved, issued or accepted. This prevents a stranded buyer decision.
- Internal quotation details are available only to the assigned Operations reviewer or Super Admin; buyer access remains organization-scoped and issued-only.
- Saved draft terms, selected candidates, unit prices and expiry are prefilled for continued editing; expiry is displayed in the editor's local timezone.
- Regression checks cover those role boundaries and cross-phase guards. All code still requires real staging and browser integration validation.
