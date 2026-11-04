-- Phase 14: farmer-consented commercial terms and Paystack-verified supplier transfers.
-- Run on a dedicated Supabase staging database after all prior migrations.
CREATE TYPE "SupplierAgreementStatus" AS ENUM ('PROPOSED','ACCEPTED','DECLINED');
CREATE TYPE "SupplierObligationStatus" AS ENUM ('PENDING_APPROVAL','APPROVED','TRANSFER_PENDING','REVIEW_REQUIRED','SETTLED');
CREATE TYPE "SupplierTransferStatus" AS ENUM ('INITIATING','UNKNOWN','PENDING','FAILED','VERIFIED','REVIEW_REQUIRED');
CREATE TYPE "SupplierReconciliationOutcome" AS ENUM ('PENDING','FAILED','VERIFIED','MISMATCH','LATE_REVIEW');
CREATE TYPE "PayoutAccountStatus" AS ENUM ('VERIFIED','BLOCKED');

CREATE TABLE "farmer_payout_accounts" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "farmerId" UUID NOT NULL,
 "bankCode" VARCHAR(12) NOT NULL, "accountName" VARCHAR(160) NOT NULL,
 "accountLast4" VARCHAR(4) NOT NULL, "encryptedNumber" VARCHAR(300) NOT NULL,
 "fingerprint" VARCHAR(64) NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
 "status" "PayoutAccountStatus" NOT NULL DEFAULT 'VERIFIED',
 "verifiedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "farmer_payout_accounts_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "farmer_payout_account_metadata_valid" CHECK (
   "version">0 AND "bankCode" ~ '^[0-9]{3,12}$' AND "accountLast4" ~ '^[0-9]{4}$' AND
   "fingerprint" ~ '^[0-9a-f]{64}$' AND length(trim("accountName"))>=3)
);
CREATE UNIQUE INDEX "farmer_payout_accounts_farmerId_key" ON "farmer_payout_accounts"("farmerId");
ALTER TABLE "farmer_payout_accounts" ADD CONSTRAINT "farmer_payout_accounts_farmerId_fkey"
 FOREIGN KEY ("farmerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "supplier_agreements" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "orderLineId" UUID NOT NULL,
 "farmerId" UUID NOT NULL,"proposedById" UUID NOT NULL,
 "unitPriceNgn" DECIMAL(16,2) NOT NULL,"currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
 "status" "SupplierAgreementStatus" NOT NULL DEFAULT 'PROPOSED',
 "version" INTEGER NOT NULL DEFAULT 1,"note" VARCHAR(2000) NOT NULL,"acceptedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "supplier_agreements_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "supplier_agreement_price_valid" CHECK ("unitPriceNgn">0 AND "currency"='NGN' AND "version">0),
 CONSTRAINT "supplier_agreement_acceptance" CHECK (
    ("status"='ACCEPTED' AND "acceptedAt" IS NOT NULL) OR
    ("status"<>'ACCEPTED' AND "acceptedAt" IS NULL))
);
CREATE UNIQUE INDEX "supplier_agreements_orderLineId_key" ON "supplier_agreements"("orderLineId");
CREATE INDEX "supplier_agreements_farmerId_status_createdAt_idx" ON "supplier_agreements"("farmerId","status","createdAt");
ALTER TABLE "supplier_agreements" ADD CONSTRAINT "supplier_agreements_orderLineId_fkey"
 FOREIGN KEY ("orderLineId") REFERENCES "order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_agreements" ADD CONSTRAINT "supplier_agreements_farmerId_fkey"
 FOREIGN KEY ("farmerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_agreements" ADD CONSTRAINT "supplier_agreements_proposedById_fkey"
 FOREIGN KEY ("proposedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "supplier_obligations" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),"orderLineId" UUID NOT NULL,
 "agreementId" UUID NOT NULL,"farmerId" UUID NOT NULL,
 "quantity" DECIMAL(18,3) NOT NULL,"amountMinor" BIGINT NOT NULL,
 "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
 "status" "SupplierObligationStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
 "approvedById" UUID,"approvedAt" TIMESTAMP(3),
 "bankFingerprint" VARCHAR(64),"bankVersion" INTEGER,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "supplier_obligations_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "supplier_obligation_financial_valid" CHECK (
   "amountMinor">0 AND "amountMinor"<=9007199254740991 AND "quantity">0 AND "currency"='NGN'),
 CONSTRAINT "supplier_obligation_approval_fields" CHECK (
   ("status"='PENDING_APPROVAL' AND "approvedAt" IS NULL AND "approvedById" IS NULL)
   OR ("status"<>'PENDING_APPROVAL' AND "approvedAt" IS NOT NULL AND "approvedById" IS NOT NULL
      AND "bankFingerprint" IS NOT NULL AND "bankVersion">0))
);
CREATE UNIQUE INDEX "supplier_obligations_orderLineId_key" ON "supplier_obligations"("orderLineId");
CREATE UNIQUE INDEX "supplier_obligations_agreementId_key" ON "supplier_obligations"("agreementId");
CREATE INDEX "supplier_obligations_farmerId_status_createdAt_idx" ON "supplier_obligations"("farmerId","status","createdAt");
CREATE INDEX "supplier_obligations_status_createdAt_idx" ON "supplier_obligations"("status","createdAt");
ALTER TABLE "supplier_obligations" ADD CONSTRAINT "supplier_obligations_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_obligations" ADD CONSTRAINT "supplier_obligations_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "supplier_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_obligations" ADD CONSTRAINT "supplier_obligations_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_obligations" ADD CONSTRAINT "supplier_obligations_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "supplier_settlement_attempts" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),"obligationId" UUID NOT NULL,
 "initiatedById" UUID NOT NULL,"reference" VARCHAR(50) NOT NULL,
 "status" "SupplierTransferStatus" NOT NULL DEFAULT 'INITIATING',
 "recipientCode" VARCHAR(100),"providerTransferId" VARCHAR(50),
 "verifiedAt" TIMESTAMP(3),"lastCheckedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "supplier_settlement_attempts_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "supplier_settlement_reference_format" CHECK ("reference" ~ '^stl_[0-9a-f]{32}$')
);
CREATE UNIQUE INDEX "supplier_settlement_attempts_reference_key" ON "supplier_settlement_attempts"("reference");
CREATE UNIQUE INDEX "supplier_settlement_attempts_providerTransferId_key" ON "supplier_settlement_attempts"("providerTransferId");
CREATE INDEX "supplier_settlement_attempts_obligationId_status_createdAt_idx" ON "supplier_settlement_attempts"("obligationId","status","createdAt");
ALTER TABLE "supplier_settlement_attempts" ADD CONSTRAINT "supplier_settlement_attempts_obligationId_fkey"
 FOREIGN KEY ("obligationId") REFERENCES "supplier_obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_settlement_attempts" ADD CONSTRAINT "supplier_settlement_attempts_initiatedById_fkey"
 FOREIGN KEY ("initiatedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "supplier_settlement_reconciliations" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),"attemptId" UUID NOT NULL,
 "actorId" UUID,"trigger" VARCHAR(20) NOT NULL,
 "outcome" "SupplierReconciliationOutcome" NOT NULL,"providerStatus" VARCHAR(40) NOT NULL,
 "providerTransferId" VARCHAR(50),"amountMinor" BIGINT,"currency" VARCHAR(3),
 "note" VARCHAR(1500) NOT NULL,"checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "supplier_settlement_reconciliations_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "supplier_reconciliation_values" CHECK ("amountMinor" IS NULL OR "amountMinor">=0)
);
CREATE INDEX "supplier_settlement_reconciliations_attemptId_checkedAt_idx"
 ON "supplier_settlement_reconciliations"("attemptId","checkedAt");
ALTER TABLE "supplier_settlement_reconciliations" ADD CONSTRAINT "supplier_settlement_reconciliations_attemptId_fkey"
 FOREIGN KEY ("attemptId") REFERENCES "supplier_settlement_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_settlement_reconciliations" ADD CONSTRAINT "supplier_settlement_reconciliations_actorId_fkey"
 FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Protect private bank data and settlement audit histories from direct authenticated Data API access.
ALTER TABLE "farmer_payout_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_agreements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_obligations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_settlement_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_settlement_reconciliations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "farmer_payout_accounts","supplier_agreements","supplier_obligations",
 "supplier_settlement_attempts","supplier_settlement_reconciliations" FROM anon,authenticated;
