# Phase 14 — Farmer-approved supplier terms, obligations, bank verification and independently reconciled payouts

**Stack:** Phase 14 `feat/phase-14-supplier-settlements`, based on Phase 13 PR #18. **Status:** code implementation candidate, not merged or real-money certified. This document is a release contract, not a claim of actual payouts.

## The central financial boundary
SmartHub centrally procures from farmers and resells to buyers. **Buyer quotation price is not a supplier purchase price.** Each source OrderLine requires a separate supplier unit-price agreement, created by assigned Operations and accepted by the actual source Farmer. Farm supply, buyer acceptance, bank verification, delivery receipt, independent payment approval and Paystack settlement are separate states.
An authorized farmer may accept or decline a versioned price and conditions. A declined proposal may be revised with a new version and audit event; an accepted agreement is not silently re-priced.
SupplierObligation is only created when order status COMPLETED, PaymentObligation status PAID, FulfillmentPlan status COMPLETED, every original order line's physical reservations are CONSUMED, actual buyer-attested ReceiptLine quantities sum exactly to the ordered quantity, and no recorded DeliveryIssue or non-rejected RefundRequest exists. Any unresolved shortage, provider payment-review exception, or buyer refund request blocks payout.
The amount in integer NGN kobo is **exact `receivedQuantity × separately accepted supplier unitPriceNgn × 100`**. If the value cannot be expressed as an integral kobo, the server rejects it instead of rounding. No fees, margin assumptions or taxes are automatically deducted.

## Farmer bank details
- The farmer is a verified, active, phone+email-confirmed Supabase Auth user. Paystack GET /bank/resolve verifies the 10-digit NUBAN belongs to that bank and returns account holder name. The name must strictly match the farmer's verified name (order-insensitive tokens); unsupported/mismatched identities require manual support and cannot override verification in the UI.
- The account number is encrypted server-side with AES-256-GCM using a **server-only 32-byte Base64 FARMER_BANK_ENCRYPTION_KEY**, authenticated with a random IV. SHA-256 HMAC fingerprints use the same secret key; account number never appears in page props, logs or audit events, only bank code and last four digits.
- If an approved, pending-transfer or review-required obligation exists, a farmer cannot silently change bank destination. A transfer attempt snapshots the exact approved encrypted bank, fingerprint, bank code and beneficiary name, so historical payout checks still match the original beneficiary even after a later profile change.
- New account data is never accepted based on user-entered account names. KMS-backed key rotation, beneficiary name exceptions and data retention require production security signoff.

## Segregation and transfer lifecycle
1. Assigned Operations proposes supplier prices; farmer accepts the exact version. Buyer price is not used.
2. Assigned Operations creates a payable only from fully buyer-received and paid order lines.
3. A separate SUPER_ADMIN account independently approves the exact amount and verified bank fingerprint. Operations cannot approve its own supplier obligation. The Super Admin approver cannot initiate the transfer.
4. `SUPPLIER_PAYOUTS_ENABLED=false` by default, even when buyer checkout is enabled. After independent policy, financial, provider and staging signoff, assigned Operations proposer may initiate the approved payout. A unique `stl_<UUIDhex>` reference and INITIATING attempt are written **before** any provider call; ambiguous network responses become UNKNOWN. No automatic retry is permitted. Every obligation has a one-attempt safety limit pending explicit financial-resolution workflow.
5. Paystack POST `/transferrecipient` creates a recipient matching the provider-verified, approved encrypted bank snapshot. POST `/transfer` uses merchant balance, exact integer kobo, NGN, stored unique reference and recipient. OTP, queued or initiated statuses never imply payment.
6. Paystack GET `/transfer/verify/:reference` must confirm `success`, unique provider transfer ID, exact reference/amount/currency, correct test/live domain, recipient code and **original approved** bank code and NUBAN before SupplierSettlementAttempt becomes VERIFIED and SupplierObligation becomes SETTLED in one serializable transaction.
7. Signed `transfer.success`, `transfer.failed`, and `transfer.reversed` webhooks invoke the same **independent server-side Paystack transfer verification** path. Webhook JSON is never trusted to credit a farmer. The existing raw-body HMAC signature check, signed payload digest deduplication and retry logic remain authoritative.
8. Failed, reversed, mismatched or late transfer results enter REVIEW_REQUIRED, with append-only financial reconciliation history and audit. There is no manual mark-paid, unverified bank transfer confirmation, public customer wallet balance or fraudulent payout transaction.

## Portal experience
Farmer: own supplier offers with exact quantity, independently negotiated farmer unit price and accept/decline controls; private bank setup with Paystack directory and masked verification; own real obligations, status and verified transfer references. No buyer identity, sales price, cost margins or other farmers' data.
Operations: assigned real paid orders and source line agreements; proposer action, farmer consent status, payable creation after full receipt, approved payout submission and independent provider reconciliation with redacted bank information.
Super Admin: separate approval queue with masked beneficiary, exact supplier liability, unambiguous audit trail, unresolved transfer review and independent provider checks. No role can silently self-approve and pay without a second independent actor.

## Official Paystack provider references (researched 2026-11-04)
- Resolve account: https://paystack.com/docs/api/verification/
- List banks and create recipients: https://paystack.com/docs/transfers/creating-transfer-recipients/
- Transfer initiation and provider verification: https://paystack.com/docs/api/transfer/
- Signed webhook verification follows the Phase 12 Paystack webhook module.

## Release gates — NOT YET COMPLETED
1. Apply predecessors and Phase 14 migration in dedicated Supabase PostgreSQL staging, verify Prisma relations, amount constraints, encrypted banking columns, indexes, RLS and deny public Data API grants. Run security advisors and query real installed DB. No real customer data or funds in test projects.
2. Configure server-only Paystack TEST keys and private FARMER_BANK_ENCRYPTION_KEY. Ensure default SUPPLIER_PAYOUTS_ENABLED remains false until explicit client approval. Test merchant recipient creation, account resolution, transfer OTP/pending/failed/success/reversal and Verify Transfer in authorized sandbox.
3. Run real concurrent Operations propose/farmer accept/Super Admin approve/transfer initiation, duplicate and lost response recovery, bank edits during approvals, repeated payout transfer reference, invalid/revoked provider result and duplicate webhooks. Confirm one payable/order line, one outbound provider attempt and no fabricated SETTLED status.
4. Test Buyer A/B, Farmer A/B, assigned/unassigned Operations, suspended farmer, Super Admin, and account-name mismatch using authenticated staging accounts; verify financial data isolation and bank encryption at rest, including signed URLs if any future statements are generated.
5. Obtain signed policy decisions for seller-of-record, supplier agreement timing and versions, gross vs net supplier due, tax/fees, bank account name exceptions, failed-payment retry/re-authorization, rejected buyer refunds, chargebacks after payout, dispute escalation and financial operations SOPs.
6. Add a monitored transfer reconciliation worker, finance alerts, bank settlement-statement matching, bank-key rotation/KMS controls, financial incident/runbooks and support escalation before production. Existing webhook plus manual authorized verify is NOT a robust unattended payout system.
7. Run actual browser/mobile acceptance and verified reconciliation with real Paystack test transactions. Do not enable live merchant payouts simply because CI passes.

**No real money was sent and no farmer transfer was executed during implementation.** Supplier settlements are distinct from buyer Paystack payments and from SmartHub's accounting profit.