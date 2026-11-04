# Phase 11 — Orders, physical lots, reservations and stock movements

**Branch:** feat/phase-11-orders-inventory (stacked on Phase 10 PR #15). **Release status:** code candidate, not staging-verified or deployed. The Phase 10 predecessor is not yet merged into main.

## Central business loop

SmartHub remains a managed procurement intermediary. Buyer quotation acceptance alone does not create an order, a reservation, a payment, a shipment, or a farmer settlement. The assigned Operations reviewer must explicitly request conversion after independently rechecking approved inspected supply and availability.

**SupplyLot:** one evidence-backed sourced physical lot per approved SupplyDeclaration. Initial quantity equals the smaller of declared and observed physical quantity, in identical units, with the exact latest SupplyInspectionAssessment reference and a recorded custody/location note. A sourced lot is NOT proof SmartHub owns or warehouse-received the produce. Operations can place it on hold or reopen it with an audited reason. A changed inspection requires reconciliation, not silent increase in available stock.

**Order:** exactly one per buyer-accepted Quotation, with immutable accepted QuoteRevision, unique UUID-derived ORD reference, initial PENDING_PAYMENT status and an explicit temporary physical hold end time. This is not a verified payment obligation, invoice, charge or paid transaction.

**OrderLine and Reservation:** each quoted line is snapshotted to the order with a specific physical lot. Each reservation begins ACTIVE and is released only through an authorized cancellation or explicit expiry procedure. CONSUMED is reserved for Phase 13 evidence-backed fulfilment, not exposed here.

**StockMovement:** append-only RECEIVED, RESERVED, RELEASED movements; CONSUMED is a future movement type. Source lots track total, outstanding reserved and irrevocably consumed quantities. Database constraints require reserved + consumed <= physical total, with no negative stock counters.

**OrderStatusEvent:** event-sourced order status audit with actor and reason.

## Implementation and transaction safety

- Only an active Operations actor with supply and sourcing permissions can register stock and create a pending order. Only the assigned sourcing reviewer can convert a buyer quotation; the assigned reviewer or Super Admin may cancel or expire unpaid pending holds.
- Buyer business profile must be complete, and business verification must not have been rejected. Whether independent commercial verification must precede payment is a Phase 12 client-policy question. This phase never charges the buyer.
- Quotation must be buyer ACCEPTED with current optimistic version, issued immutable revision, actual line prices, a still-valid expiry and interest from the source farmer.
- Every source supply must currently be APPROVED with a verified active farmer, latest accepted inspection, matching commodity/unit/quantity, and existing registered physical lot supported by that inspection.
- Lot row locks are acquired in stable UUID order inside Prisma Serializable transactions; total requested quantity is grouped per lot before checking physical minus outstanding reserved minus consumed quantity. Only after all checks pass are order, lines, reservations, movements and balance increments committed.
- Concurrent transaction and duplicate-key errors fail safely and require retry/reload. Uniqueness enforces one order per quotation and one ordered line per quote line. A sequential repeat by the original Operations creator returns the existing order, not a duplicate reservation.
- Operations must explicitly supply a hold deadline from one hour up to 14 days ahead. This is a safety limit pending client policy; expiry is NOT automatically executed until a scheduled job is added and verified.
- Cancel/expire only a current PENDING_PAYMENT order with all ACTIVE reservations, optimistic version, and reason. Consumed or already released reservations are not restored as available stock. Entire transaction rolls back if any source lot ledger is inconsistent.
- None of these actions can confirm or fake payment or mark a delivery complete. Later phases own those state transitions.

## Portal integration

- Operations: sourced-lot ledger and shortage status, source evidence intake, hold/reopen, accepted-quote conversion to reserved pending order, order list/detail, expiry and cancellation workflow.
- Buyer: organization-scoped order list/detail, actual accepted quote amount, physical hold deadline and status history. No source-farmer identity or internal inventory details.
- Farmer: own physical-source allocations and provisional reservation status only, without buyer identity or commercial unit prices.
- Super Admin: Operations-level oversight and audited release actions.
- Buyer and Operations dashboards show actual database-derived quote/order/lot metrics, not fictitious totals.

## Mandatory staging acceptance gates (not completed)

1. Apply all prior migrations, then Phase 11 to isolated Supabase/PostgreSQL staging; verify generated Prisma schema, foreign keys, PostgreSQL checks, RLS and no public Data API grants.
2. Reconcile one fully approved inspection to a physical sourced lot, then one approved buyer quote through acceptance, Operations conversion, pending order, active reservations and stock movement history.
3. Run simultaneous two-buyer and two-quote tests against one physical lot (including two quote lines sharing a lot). Verify one successful reservation cannot reduce the other's available balance below zero.
4. Test stale inspection, farmer status revocation, source withdrawal, lot hold, duplicate order, changed quote version, mismatched quantity/unit and quote expiry.
5. Verify cancellation and explicit expiration restore only ACTIVE reservations and cannot restore CONSUMED or previously released quantity. Confirm audit and movement totals reconcile with counters.
6. Test Buyer A vs Buyer B, Farmer A vs Farmer B, assigned vs unassigned Operations, Super Admin, VIEWER and suspended accounts using real Auth, browser/mobile flows and accessible UI.
7. Obtain client signoff for physical custody claims, source lot definition, hold/quote expiry, commercial verification and cancellation policy.
8. Phase 12 must implement payment obligations, provider webhook signatures, idempotent receipt and reconciliation before PAYMENT_VERIFIED is possible. Phase 13 must consume stock only with trusted fulfilment evidence, never because a frontend redirect says payment succeeded.

**No scheduled expiry worker, live checkout, actual payment, dispatch, or supplier settlement is claimed.** Structural contract tests are not substitutes for a real database and browser staging acceptance.
