# Phase 12 — Buyer Paystack payments and reconciliation

Status: implementation candidate on feat/phase-12-payments-reconciliation, stacked on Phase 11 PR #16. Not deployed, not Supabase-staging-verified, not authorized for live money.

## Official provider API and security
Paystack transaction docs: https://paystack.com/docs/api/transaction/
Paystack webhooks docs: https://paystack.com/docs/payments/webhooks/
Initialize and verify payments server-side, via POST /transaction/initialize and GET /transaction/verify/:reference; amount is calculated as exact integer NGN kobo from the accepted order.
Modern Paystack-Signature uses a private whsec_ signing secret with a timestamped HMAC SHA512 over raw request bytes, checked within five minutes. Legacy x-paystack-signature is supported only if the modern header is absent, using the private Paystack API secret to HMAC the raw body.
No browser callback, client value, webhook body or manual administrator flag proves that a payment succeeded.

## Required private environment configuration
PAYMENTS_ENABLED=false by default. Flip to true only after approved merchant onboarding, correct terms, tests and commercial review.
PAYSTACK_SECRET_KEY — secret server-side test/live key; never NEXT_PUBLIC.
PAYSTACK_WEBHOOK_SECRET — preferred modern private whsec signing secret, when available.
APP_BASE_URL — verified HTTPS origin, used for the informational return URL.
Webhook endpoint: {APP_BASE_URL}/api/payments/paystack/webhook. Configure it on the correct Paystack test/live dashboard.

## Models
PaymentObligation: immutable provider-eligible order total, NGN integer minor units, owner organization and PAID/UNPAID/REVIEW_REQUIRED accounting status.
PaymentAttempt: unique SMH-UUID checkout reference, verified owner email, durable INITIATING/READY/UNKNOWN/FAILED/VERIFIED lifecycle, provider URL and transaction identity. INITIATING or UNKNOWN prevents duplicate automatic checkout.
PaymentProviderEvent: unique SHA256 digest of signed raw bytes, provider event, unmatched reference, signature scheme and processing result. Raw card data is not persisted.
PaymentReconciliation: append-only direct provider check, trigger, exact amount, currency, provider transaction ID, outcome and date.
RefundRequest: owner-authored refund-review case and Super Admin decision log. It does NOT issue a Paystack refund or mark any amount returned.

## Test-mode versus live-money protection

Paystack test keys (`sk_test_`) support test-mode integration exercises when `PAYMENTS_ENABLED=true` in an isolated, approved staging environment. A live key (`sk_live_`) is rejected unless `PAYSTACK_LIVE_ENABLED=true`, `NODE_ENV=production`, and the configured `APP_BASE_URL` equals the explicitly reviewed HTTPS `PRODUCTION_BASE_URL`. Preview deployments can also use `NODE_ENV=production`; that alone is not sufficient to authorize live charges or payouts. Keep the explicit live flag disabled until financial and business acceptance is approved. Do not enable it for staging or local machines.

## Commercial verification gates
Only an active buyer owner with a real organization-scoped PENDING_PAYMENT order and active physical reservations can initialize checkout.
Provider init happens after recording a unique durable attempt. Ambiguous network failure becomes UNKNOWN rather than launching another possible charge.
Paystack verify must independently match reference, success status, exact NGN kobo, currency, payer email, unique transaction ID, key environment and still-active unexpired order hold.
Serializable order locks ensure payment verification and order cancellation cannot both win. Only after every check succeeds do the obligation and order become PAID and PAYMENT_VERIFIED.
Wrong amounts, already-used transactions, late/expired/cancelled orders and reversed/changed provider statuses move to REVIEW_REQUIRED. A previously verified but not-yet-dispatched order moves to PAYMENT_REVIEW, blocking later fulfilment from relying on a stale verified status. These exceptions do not restore stock or automatically refund a payer.
Buyer and Operations can initiate independent server-to-server reconciliation; Operations requires an assigned case or Super Admin role. A signed webhook cannot bypass provider verification.
Buyer callback is informational and never writes payment state. Super Admin refund review cannot initiate transfers, refunds or manual mark-paid actions.
New financial tables enable RLS and revoke Data API permissions from anon/authenticated roles.

## UI
Buyer order to secure Paystack checkout, buyer payment obligations/history, independent verify action, refund review request and safe callback.
Operations payments/reconciliation queue and detail with provider outcomes and exception history.
Super Admin refund cases and finance oversight; no invented transactions or balances.

## Not completed: staging and release acceptance
1. Apply all predecessor Prisma migrations then Phase 12 migration in isolated Supabase staging; verify FK, indexes, RLS, exact minor units, advisor checks.
2. Configure real Paystack test credentials, HTTPS callback and webhook signing secret; keep production checkout disabled until approved.
3. Test real signed modern and legacy webhook examples, replays, wrong signatures, provider timeouts and retries, duplicate events, mismatched amounts/currency/email, invalid provider domain, late charges and repeated reconciliation.
4. Verify concurrent webhook, buyer verify, Operations reconciliation and expiry/cancel against a real Postgres database, preserving one successful paid transition and no paid-after-cancel.
5. Test Buyer A/B, VIEWER, suspended actors, assigned/unassigned Operations and Super Admin in actual browser/mobile sessions.
6. Obtain written seller-of-record, tax/fee, refund, pricing and late-payment policies. Verify real bank settlement reconciliation.
7. Implement and verify provider-initiated refund processing and provider-confirmed refund finality before claiming refunds can be completed. Add monitored reconciliation worker and alerts after approval.

Payments are an explicit deployment gate; no production-capable live money processing is claimed solely from a green build.