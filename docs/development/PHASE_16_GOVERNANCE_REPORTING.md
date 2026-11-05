# Phase 16 — Super Admin governance, reporting and financial oversight

**Branch**: feat/phase-16-governance-reporting, stacked on Phase 15 PR #20. **Status**: draft code implementation; no Supabase staging migration, production deployment or customer-data claim.

## Scope implemented
- Super Admin home: real counts of open incidents, payments in financial review, buyer delivery issues, outstanding support, existing staff administration, governance audit and reporting.
- Platform reporting: 7/30/90-day window filters, account counts, buyer organizations, farmer verification status, created sourcing requests/quotations/orders by current status, verified buyer payment amounts, independently verified settled supplier transfer amounts, source lot balances and current risk/exception counts.
- Financial measures use exact integer NGN kobo. Paid buyer obligations are counted only with PAID + verifiedAt in requested window. Supplier transfer totals use distinct obligations with independently VERIFIED Paystack transfer attempts in window AND current SETTLED supplier obligation status. These event-date totals are *not* gross profit, net revenue, cash in bank or a bank reconciliation. An obligation that subsequently moves to REVIEW_REQUIRED is not counted as still settled.
- Supply lot quantity totals mix potentially different commodity units, explicitly labelled as non-comparable ledger controls, not a physical weight or value.
- Separate time-bounded daily buyer verification breakdown and CSV export of *aggregate* statuses and amounts. Export has no names, phone numbers, bank numbers or customer identifiers; includes no arbitrary user-entered CSV cells and escapes spreadsheet prefixes.
- Super Admin buyer/farmer directory with server role restriction, filters/search, pagination, current membership and verification data; read-only detail and related audit trail. Existing staff controls and verification remain separate and are not duplicated with role escalation shortcuts.
- Incident workflow: verified source ACCOUNT/ORDER/BUYER_PAYMENT/SUPPLIER_OBLIGATION/SHIPMENT/SUPPORT_CASE link, severity, category, reason-coded case creation and append-only events, active Super Admin-only assignment and explicit state machine OPEN -> INVESTIGATING -> MITIGATED -> CLOSED; reopening Closed -> Open with reason. SERIALIZABLE row locking and expectedVersion protect against concurrent updates. A case decision never changes the referenced payment, order, delivery, inventory or account.
- Admin configuration: read-only flags indicating server-side checkout/payout feature gates, in-app notification scope, refund availability and presence of DB environment configuration. Never shows private key or changes security-sensitive environment variables.
- Fixed permission templates extended with platform.reports.read and platform.governance.manage only for SUPER_ADMIN. All governance and CSV endpoints recheck server-sourced auth and roles.
- PostgreSQL migration creates GovernanceIncident and GovernanceIncidentEvent, FK indexes, required reason checks, append-only case events, RLS and Data API permission revocation.

## Validity, as-of and reconciliation boundaries
- All reporting reads live authoritative records, not mocks or cached demo metrics. The 'created within window, grouped by current status' metric is not a historical snapshot; current exception totals span all dates. Every screen shows the nature of the metric.
- Report period uses sliding 7/30/90 day UTC windows and an explicit as-of time, though queries are concurrent and therefore not an atomic historical accounting snapshot. For formally audited results, run approved closed-period snapshots and bank-settlement reconciliation.
- A current 'provider verified' Paystack status is not a substitute for bank statement reconciliation, VAT/tax/fees, completed refund policy or beneficiary bank receipt.
- Incident workflow only records facts, investigation and human resolution intent; marking CLOSED does not issue refunds, approve supplier payouts or resolve disputes in the underlying source record.

## Outstanding release gates
1. Apply all predecessor Prisma migrations and Phase 16 migration to a dedicated real Supabase staging project; verify generated client/schema, indexes and RLS with actual PostgreSQL tests.
2. Test Buyer/ Farmer / Field Agent / Operations / Super Admin routes and APIs with real JWTs, including hostile POST to governance and CSV export, role changes mid-session, suspended Super Admin and cross-org access.
3. Test concurrent status changes and assignments with stale expectedVersion, invalid source IDs, idempotent retries, reconciling incident events to auth audit.
4. Reconcile report sum by independent database queries for buyer payments and supplier transfers (including late reversals, duplicate transactions, negative adjustments and open refunds). CSV should match the visible authorized aggregates.
5. Approve operational definitions with client/finance/legal: gross verified money, bank settlement, refunds, tax, profit, platform fees, supplier liability and negative adjustments. Current reporting does not invent any net-profit KPI.
6. Verify large-data query plans, dashboard latency, error states, pagination for exports and service telemetry; restore and rollback migration scenarios.
7. Before real production: all stacked PRs reviewed and merged in order, release engineering Phase 17 complete, real end-to-end test from onboarding through buyer demand, quote, payment, receipt, transfer and incident review.

## Not claimed
No live staging checks, production deployment, automated refunds, payouts, real bank reconciliation, ability to elevate arbitrary roles, autonomous incident resolution or formal accounting report is claimed from this phase alone.