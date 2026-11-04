-- Phase 12 — provider-backed payments, reconciliation and buyer refund review cases.
-- No public Data API access. All writes use server-verified identity and payment-provider checks.
CREATE TYPE "PaymentObligationStatus" AS ENUM ('UNPAID','PAID','REVIEW_REQUIRED','CANCELLED');
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('INITIATING','READY','UNKNOWN','FAILED','VERIFIED');
CREATE TYPE "PaymentEventStatus" AS ENUM ('RECEIVED','IGNORED','VERIFIED','REVIEW_REQUIRED');
CREATE TYPE "ReconciliationOutcome" AS ENUM ('VERIFIED','PENDING','FAILED','MISMATCH','LATE_PAYMENT');
CREATE TYPE "ReconciliationTrigger" AS ENUM ('BUYER','WEBHOOK','OPERATIONS');
CREATE TYPE "RefundCaseStatus" AS ENUM ('REQUESTED','UNDER_REVIEW','REJECTED','RESOLUTION_REQUIRED','CLOSED');

CREATE TABLE "payment_obligations" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "orderId" UUID NOT NULL, "organizationId" UUID NOT NULL,
 "amountMinor" BIGINT NOT NULL, "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
 "status" "PaymentObligationStatus" NOT NULL DEFAULT 'UNPAID', "verifiedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "payment_obligations_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "payment_obligations_amount_positive" CHECK ("amountMinor" > 0 AND "amountMinor" <= 9007199254740991),
 CONSTRAINT "payment_obligations_ngn_only" CHECK ("currency" = 'NGN')
);
CREATE UNIQUE INDEX "payment_obligations_orderId_key" ON "payment_obligations"("orderId");
CREATE INDEX "payment_obligations_organizationId_status_createdAt_idx" ON "payment_obligations"("organizationId","status","createdAt");
ALTER TABLE "payment_obligations" ADD CONSTRAINT "payment_obligations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_obligations" ADD CONSTRAINT "payment_obligations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "buyer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "payment_attempts" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "obligationId" UUID NOT NULL,
 "reference" VARCHAR(60) NOT NULL, "payerId" UUID NOT NULL, "payerEmail" VARCHAR(254) NOT NULL,
 "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'INITIATING',
 "authorizationUrl" VARCHAR(2048), "providerTransactionId" VARCHAR(48),
 "verifiedAt" TIMESTAMP(3), "lastCheckedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "payment_attempts_reference_valid" CHECK ("reference" ~ '^SMH-[0-9A-F]{32}$'),
 CONSTRAINT "payment_attempts_payer_email" CHECK (length(trim("payerEmail")) >= 3)
);
CREATE UNIQUE INDEX "payment_attempts_reference_key" ON "payment_attempts"("reference");
CREATE UNIQUE INDEX "payment_attempts_providerTransactionId_key" ON "payment_attempts"("providerTransactionId");
CREATE INDEX "payment_attempts_obligationId_status_createdAt_idx" ON "payment_attempts"("obligationId","status","createdAt");
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "payment_obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "payment_provider_events" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "payloadHash" VARCHAR(64) NOT NULL,
 "eventName" VARCHAR(100) NOT NULL, "reference" VARCHAR(60), "attemptId" UUID,
 "signatureMode" VARCHAR(20) NOT NULL, "status" "PaymentEventStatus" NOT NULL DEFAULT 'RECEIVED',
 "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "processedAt" TIMESTAMP(3),
 CONSTRAINT "payment_provider_events_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "payment_provider_events_hash" CHECK ("payloadHash" ~ '^[0-9a-f]{64}$'),
 CONSTRAINT "payment_provider_events_signature" CHECK ("signatureMode" IN ('v1','legacy'))
);
CREATE UNIQUE INDEX "payment_provider_events_payloadHash_key" ON "payment_provider_events"("payloadHash");
CREATE INDEX "payment_provider_events_attemptId_receivedAt_idx" ON "payment_provider_events"("attemptId","receivedAt");
ALTER TABLE "payment_provider_events" ADD CONSTRAINT "payment_provider_events_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "payment_reconciliations" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "attemptId" UUID NOT NULL,
 "actorId" UUID, "trigger" "ReconciliationTrigger" NOT NULL,
 "outcome" "ReconciliationOutcome" NOT NULL,
 "providerStatus" VARCHAR(40) NOT NULL, "providerTransactionId" VARCHAR(48),
 "amountMinor" BIGINT, "currency" VARCHAR(3), "note" VARCHAR(1500),
 "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "payment_reconciliations_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "payment_reconciliations_amount_valid" CHECK ("amountMinor" IS NULL OR "amountMinor" >= 0)
);
CREATE INDEX "payment_reconciliations_attemptId_checkedAt_idx" ON "payment_reconciliations"("attemptId","checkedAt");
CREATE INDEX "payment_reconciliations_outcome_checkedAt_idx" ON "payment_reconciliations"("outcome","checkedAt");
ALTER TABLE "payment_reconciliations" ADD CONSTRAINT "payment_reconciliations_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_reconciliations" ADD CONSTRAINT "payment_reconciliations_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "refund_requests" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "obligationId" UUID NOT NULL,
 "requestedById" UUID NOT NULL, "reviewedById" UUID,
 "reason" VARCHAR(2000) NOT NULL, "status" "RefundCaseStatus" NOT NULL DEFAULT 'REQUESTED',
 "reviewNote" VARCHAR(2000), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "refund_requests_reason" CHECK (length(trim("reason")) >= 15)
);
CREATE UNIQUE INDEX "refund_requests_obligationId_requestedById_key" ON "refund_requests"("obligationId","requestedById");
CREATE INDEX "refund_requests_status_createdAt_idx" ON "refund_requests"("status","createdAt");
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "payment_obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- No service role secret or other credential is saved to any table.
-- Backend Prisma uses its privileged server database connection; public Data API is denied.
ALTER TABLE "payment_obligations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_provider_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_reconciliations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refund_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "payment_obligations","payment_attempts","payment_provider_events","payment_reconciliations","refund_requests" FROM anon, authenticated;
