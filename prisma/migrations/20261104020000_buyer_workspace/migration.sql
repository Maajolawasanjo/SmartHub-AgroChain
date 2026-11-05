-- Phase 08: buyer business identity, one-account membership, saved requirements and destinations.
-- Profiles are NOT verified automatically. Requests, quotes, payments and stock reservations are out of scope.
CREATE TYPE "BuyerBusinessType" AS ENUM ('REGISTERED_COMPANY','SOLE_PROPRIETORSHIP','COOPERATIVE','PARTNERSHIP','OTHER');
CREATE TYPE "BuyerContactMethod" AS ENUM ('EMAIL','PHONE','WHATSAPP');
CREATE TYPE "BuyerMembershipRole" AS ENUM ('OWNER','EDITOR','VIEWER');
CREATE TYPE "BuyerVerificationStatus" AS ENUM ('NOT_REQUESTED','PENDING_REVIEW','MORE_INFO_REQUIRED','VERIFIED','REJECTED');

CREATE TABLE "buyer_organizations" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "businessName" VARCHAR(160),
 "businessType" "BuyerBusinessType",
 "registrationNumber" VARCHAR(80),
 "contactName" VARCHAR(160),
 "contactEmail" VARCHAR(254),
 "contactPhone" VARCHAR(24),
 "state" VARCHAR(60),
 "city" VARCHAR(120),
 "addressLine" VARCHAR(240),
 "preferredContactMethod" "BuyerContactMethod" NOT NULL DEFAULT 'EMAIL',
 "verificationStatus" "BuyerVerificationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "buyer_organizations_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "buyer_organizations_businessName_not_blank" CHECK ("businessName" IS NULL OR length(trim("businessName"))>0)
);
CREATE TABLE "buyer_memberships" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "organizationId" UUID NOT NULL,
 "accountId" UUID NOT NULL,
 "role" "BuyerMembershipRole" NOT NULL DEFAULT 'OWNER',
 "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "buyer_memberships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "buyer_memberships_accountId_key" ON "buyer_memberships"("accountId");
CREATE INDEX "buyer_memberships_organizationId_role_idx" ON "buyer_memberships"("organizationId","role");
ALTER TABLE "buyer_memberships" ADD CONSTRAINT "buyer_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "buyer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_memberships" ADD CONSTRAINT "buyer_memberships_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "buyer_delivery_destinations" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "organizationId" UUID NOT NULL,
 "label" VARCHAR(80) NOT NULL,
 "state" VARCHAR(60) NOT NULL,
 "city" VARCHAR(120) NOT NULL,
 "addressLine" VARCHAR(240) NOT NULL,
 "contactName" VARCHAR(160),
 "contactPhone" VARCHAR(24),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "buyer_delivery_destinations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "buyer_delivery_destinations_organizationId_createdAt_idx" ON "buyer_delivery_destinations"("organizationId","createdAt");
ALTER TABLE "buyer_delivery_destinations" ADD CONSTRAINT "buyer_delivery_destinations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "buyer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "buyer_saved_specifications" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "organizationId" UUID NOT NULL,
 "createdById" UUID NOT NULL,
 "commodityId" UUID NOT NULL,
 "typeId" UUID,
 "specificationId" UUID,
 "label" VARCHAR(120) NOT NULL,
 "quantity" DECIMAL(18,3) NOT NULL,
 "unit" VARCHAR(30) NOT NULL,
 "deliveryState" VARCHAR(60),
 "notes" VARCHAR(1000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "buyer_saved_specifications_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "buyer_saved_specifications_quantity_positive" CHECK ("quantity">0),
 CONSTRAINT "buyer_saved_specifications_unit_valid" CHECK ("unit" IN ('KG','TONNE','BAG','PIECE'))
);
CREATE INDEX "buyer_saved_specifications_organizationId_createdAt_idx" ON "buyer_saved_specifications"("organizationId","createdAt");
ALTER TABLE "buyer_saved_specifications" ADD CONSTRAINT "buyer_saved_specifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "buyer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_saved_specifications" ADD CONSTRAINT "buyer_saved_specifications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_saved_specifications" ADD CONSTRAINT "buyer_saved_specifications_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_saved_specifications" ADD CONSTRAINT "buyer_saved_specifications_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "commodity_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "buyer_saved_specifications" ADD CONSTRAINT "buyer_saved_specifications_specificationId_fkey" FOREIGN KEY ("specificationId") REFERENCES "commodity_specifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "buyer_verification_events" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "organizationId" UUID NOT NULL,
 "actorId" UUID,
 "status" "BuyerVerificationStatus" NOT NULL,
 "note" VARCHAR(2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "buyer_verification_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "buyer_verification_events_organizationId_createdAt_idx" ON "buyer_verification_events"("organizationId","createdAt");
ALTER TABLE "buyer_verification_events" ADD CONSTRAINT "buyer_verification_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "buyer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_verification_events" ADD CONSTRAINT "buyer_verification_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Sensitive business data remains behind server-side Prisma authorization.
ALTER TABLE "buyer_organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buyer_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buyer_delivery_destinations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buyer_saved_specifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buyer_verification_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "buyer_organizations", "buyer_memberships", "buyer_delivery_destinations", "buyer_saved_specifications", "buyer_verification_events" FROM anon, authenticated;
