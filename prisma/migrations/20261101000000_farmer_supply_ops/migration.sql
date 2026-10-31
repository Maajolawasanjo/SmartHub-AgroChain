-- Phase 2, to be deployed AFTER the authentication migration to the dedicated SmartHub database.
-- No automatic inventory reservation, matching, publication or payments are permitted by these tables.
CREATE TYPE "FarmerVerificationStatus" AS ENUM ('DRAFT','PENDING_REVIEW','MORE_INFO_REQUIRED','VERIFIED','REJECTED');
CREATE TYPE "CropStage" AS ENUM ('PLANNED','GROWING','HARVESTED','INACTIVE');
CREATE TYPE "SupplyReviewStatus" AS ENUM ('DRAFT','PENDING_REVIEW','MORE_INFO_REQUIRED','APPROVED','REJECTED','WITHDRAWN');

CREATE TABLE "commodities" (
 "id" UUID NOT NULL, "name" VARCHAR(100) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT TRUE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "commodities_pkey" PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "commodities_name_key" ON "commodities"("name");
CREATE TABLE "farms" (
 "id" UUID NOT NULL, "farmerId" UUID NOT NULL,
 "name" VARCHAR(160) NOT NULL, "state" VARCHAR(60) NOT NULL, "lga" VARCHAR(120) NOT NULL,
 "community" VARCHAR(160), "locationNote" VARCHAR(500),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "farms_pkey" PRIMARY KEY("id")
);
CREATE INDEX "farms_farmerId_createdAt_idx" ON "farms"("farmerId","createdAt");
CREATE TABLE "farmer_verifications" (
 "id" UUID NOT NULL,"farmerId" UUID NOT NULL,"status" "FarmerVerificationStatus" NOT NULL DEFAULT 'DRAFT',
 "submittedAt" TIMESTAMP(3),"reviewedAt" TIMESTAMP(3),"reviewedById" UUID,
 "feedback" VARCHAR(2000),"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "farmer_verifications_pkey" PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "farmer_verifications_farmerId_key" ON "farmer_verifications"("farmerId");
CREATE INDEX "farmer_verifications_status_submittedAt_idx" ON "farmer_verifications"("status","submittedAt");
CREATE TABLE "farmer_verification_events" (
 "id" UUID NOT NULL,"verificationId" UUID NOT NULL,"actorId" UUID NOT NULL,
 "status" "FarmerVerificationStatus" NOT NULL,"note" VARCHAR(2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "farmer_verification_events_pkey" PRIMARY KEY("id")
);
CREATE INDEX "farmer_verification_events_verificationId_createdAt_idx" ON "farmer_verification_events"("verificationId","createdAt");
CREATE TABLE "farmer_crops" (
 "id" UUID NOT NULL,"farmerId" UUID NOT NULL,"farmId" UUID NOT NULL,"commodityId" UUID NOT NULL,
 "variety" VARCHAR(120),"stage" "CropStage" NOT NULL DEFAULT 'GROWING',
 "plantingDate" DATE,"expectedHarvestAt" DATE,"estimatedQuantity" DECIMAL(18,3),
 "estimatedUnit" VARCHAR(30),"notes" VARCHAR(2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "farmer_crops_pkey" PRIMARY KEY("id"),
 CONSTRAINT "farmer_crops_estimatedQuantity_check" CHECK ("estimatedQuantity" IS NULL OR "estimatedQuantity" > 0),
 CONSTRAINT "farmer_crops_estimatedUnit_check" CHECK (("estimatedQuantity" IS NULL AND "estimatedUnit" IS NULL) OR ("estimatedQuantity" IS NOT NULL AND "estimatedUnit" IS NOT NULL))
);
CREATE INDEX "farmer_crops_farmerId_stage_idx" ON "farmer_crops"("farmerId","stage");
CREATE INDEX "farmer_crops_farmId_idx" ON "farmer_crops"("farmId");
CREATE TABLE "supply_declarations" (
 "id" UUID NOT NULL,"farmerId" UUID NOT NULL,"farmId" UUID NOT NULL,"cropId" UUID,"commodityId" UUID NOT NULL,
 "variety" VARCHAR(120),"quantity" DECIMAL(18,3) NOT NULL,"unit" VARCHAR(30) NOT NULL,
 "packaging" VARCHAR(160),"harvestDate" DATE,"reportedCondition" VARCHAR(160) NOT NULL,
 "storageNote" VARCHAR(1000),"notes" VARCHAR(2000),
 "status" "SupplyReviewStatus" NOT NULL DEFAULT 'DRAFT',"submittedAt" TIMESTAMP(3),
 "reviewedAt" TIMESTAMP(3),"reviewedById" UUID,"feedback" VARCHAR(2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "supply_declarations_pkey" PRIMARY KEY("id"),
 CONSTRAINT "supply_declarations_quantity_check" CHECK ("quantity" > 0)
);
CREATE INDEX "supply_declarations_farmerId_status_createdAt_idx" ON "supply_declarations"("farmerId","status","createdAt");
CREATE INDEX "supply_declarations_status_submittedAt_idx" ON "supply_declarations"("status","submittedAt");
CREATE TABLE "supply_review_events" (
 "id" UUID NOT NULL,"supplyId" UUID NOT NULL,"actorId" UUID NOT NULL,
 "status" "SupplyReviewStatus" NOT NULL,"note" VARCHAR(2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "supply_review_events_pkey" PRIMARY KEY("id")
);
CREATE INDEX "supply_review_events_supplyId_createdAt_idx" ON "supply_review_events"("supplyId","createdAt");

ALTER TABLE "farms" ADD CONSTRAINT "farms_farmerId_fkey" FOREIGN KEY("farmerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "farmer_verifications" ADD CONSTRAINT "farmer_verifications_farmerId_fkey" FOREIGN KEY("farmerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "farmer_verifications" ADD CONSTRAINT "farmer_verifications_reviewedById_fkey" FOREIGN KEY("reviewedById") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "farmer_verification_events" ADD CONSTRAINT "farmer_verification_events_verificationId_fkey" FOREIGN KEY("verificationId") REFERENCES "farmer_verifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "farmer_crops" ADD CONSTRAINT "farmer_crops_farmerId_fkey" FOREIGN KEY("farmerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "farmer_crops" ADD CONSTRAINT "farmer_crops_farmId_fkey" FOREIGN KEY("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "farmer_crops" ADD CONSTRAINT "farmer_crops_commodityId_fkey" FOREIGN KEY("commodityId") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_declarations" ADD CONSTRAINT "supply_declarations_farmerId_fkey" FOREIGN KEY("farmerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_declarations" ADD CONSTRAINT "supply_declarations_farmId_fkey" FOREIGN KEY("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_declarations" ADD CONSTRAINT "supply_declarations_cropId_fkey" FOREIGN KEY("cropId") REFERENCES "farmer_crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_declarations" ADD CONSTRAINT "supply_declarations_commodityId_fkey" FOREIGN KEY("commodityId") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_declarations" ADD CONSTRAINT "supply_declarations_reviewedById_fkey" FOREIGN KEY("reviewedById") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supply_review_events" ADD CONSTRAINT "supply_review_events_supplyId_fkey" FOREIGN KEY("supplyId") REFERENCES "supply_declarations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Application-only schema. Do not grant any direct browser REST access.
ALTER TABLE "commodities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farmer_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farmer_verification_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farmer_crops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supply_declarations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supply_review_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "commodities","farms","farmer_verifications","farmer_verification_events","farmer_crops","supply_declarations","supply_review_events" FROM anon, authenticated;
