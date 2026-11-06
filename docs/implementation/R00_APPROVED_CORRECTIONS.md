# R00 follow-on — Approved copy and dashboard facts

**Change class:** Safe, non-disputed presentation and already-authorized read-only reporting corrections.
**Baseline:** R00 requirements-governance PR #45. The product-owner decision gates remain unresolved.

## Implemented

| Area | Correction | Contract |
|---|---|---|
| Public homepage | Restore final V3 SEO title/description, exact hero position, copy, CTAs and value-chain headings | Public copy is explicit and the links point to supported Buyer/Farmer signup routes. Registration remains gated by existing release flags. |
| Buyer dashboard | Show Active Requests, valid Quotes Awaiting Decision, Orders in Fulfilment and Payments Due | Values derive from buyer-organization-owned records. No pending-payment order is mislabeled as being in fulfilment; invalid/expired quote revisions are not counted as actionable. |
| Buyer attention | Display real clarification requests, valid decision-ready quotes, existing unpaid obligations, and incomplete profiles | Each item navigates to an implemented route. No speculative quote, amount or account decision is generated. |
| Buyer quick actions | Use Products & Supply, My Requests & Quotes, Orders & Fulfilment, Payments & Transactions | All four actions are navigable. |
| Farmer dashboard | Replace outdated unavailable messaging with scoped counts of real active sourced orders and invited opportunities | A provisional hold is not a confirmed buyer payment or farmer settlement. No buyer identity, commercial unit price or confidential sourcing terms are leaked. |
| Operations dashboard | Remove dated “future modules” claim | The existing request, quotation, order, inventory and finance modules are implemented as code but remain subject to real acceptance tests and release flags. |

## Explicitly not decided

This work **does not** decide what the final Farmer four KPI categories should be where client-approved sources conflict. Existing UI categories are retained; only their false/unavailable values are corrected.

It also does **not** choose between automated or manual quotation-to-order conversion, 100%/75% deposits, Admin architecture, privileged roles, financial approval policies, or expanded release scope. Reference non-confidential gates in `docs/implementation/r00-gates.json`.

## Validation

- `tests/r00-implementation-ready-corrections.test.mjs` checks the source-derived copy, scoped real metrics and unchanged commercial controls.
- Existing `tests/phase06-farmer.test.mjs`, `tests/phase08-buyer.test.mjs`, and `e2e/public.acceptance.spec.mjs` were updated for corrected UI facts.
- Standard repository CI must pass source tests, Prisma/TypeScript, Next.js production build and desktop/mobile public browser acceptance before merging.

## Remaining release caveat

Even after green source CI, authenticated Buyer/Farmer/Operations dashboards cannot be certified as fully end-to-end working without the dedicated live-role acceptance environment, permitted customer data, verified provider callbacks and production deployment checks.
