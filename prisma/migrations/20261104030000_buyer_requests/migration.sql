-- Phase 09: buyer sourcing requests and Operations demand review.
-- No quotations, stock reservations, prices, orders or payment transactions are created.
CREATE TYPE "BuyerRequestStatus" AS ENUM ('DRAFT','SUBMITTED','UNDER_REVIEW','MORE_INFO_REQUIRED','SOURCING_IN_PROGRESS','CLOSED','CANCELLED');
CREATE TYPE "BuyerFulfilmentMethod" AS ENUM ('SMARTHUB_DELIVERY','BUYER_PICKUP','THIRD_PARTY');
CREATE TYPE "BuyerRequestEventKind" AS ENUM ('CREATED','DRAFT_UPDATED','SUBMITTED','REVIEW_STARTED','CLARIFICATION_REQUESTED','CLARIFICATION_ANSWERED','SOURCING_STARTED','CANCELLED','CLOSED');

CREATE TABLE "buyer_requests" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "reference" VARCHAR(40) NOT NULL,
 "clientRequestKey" UUID NOT NULL,
 "clientRequestHash" VARCHAR(64) NOT NULL,
 "organizationId" UUID NOT NULL,
 "createdById" UUID NOT NULL,
 "status" "BuyerRequestStatus" NOT NULL DEFAULT 'DRAFT',
 "version" INTEGER NOT NULL DEFAULT 1,
 "deliveryState" VARCHAR(60),
 "deliveryCity" VARCHAR(120),
 "deliveryAddress" VARCHAR(240),
 "requiredDate" DATE,
 "fulfilmentMethod" "BuyerFulfilmentMethod",
 "notes" VARCHAR(2000),
 "draftPayload" JSONB,
 "submittedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "buyer_requests_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "buyer_requests_version_positive" CHECK ("version" > 0),
 CONSTRAINT "buyer_requests_idempotency_hash" CHECK ("clientRequestHash" ~ '^[0-9a-f]{64}$'),
 CONSTRAINT "buyer_requests_reference_format" CHECK ("reference" ~ '^REQ-[0-9A-F]{32}$'),
 CONSTRAINT "buyer_requests_submitted_fields" CHECK ("status" = 'DRAFT' OR "status" = 'CANCELLED' OR ("submittedAt" IS NOT NULL AND "deliveryState" IS NOT NULL AND "deliveryCity" IS NOT NULL AND "requiredDate" IS NOT NULL AND "fulfilmentMethod" IS NOT NULL))
);
CREATE UNIQUE INDEX "buyer_requests_reference_key" ON "buyer_requests"("reference");
CREATE UNIQUE INDEX "buyer_requests_organization_clientRequestKey_key" ON "buyer_requests"("organizationId","clientRequestKey");
CREATE INDEX "buyer_requests_organizationId_status_updatedAt_idx" ON "buyer_requests"("organizationId","status","updatedAt");
CREATE INDEX "buyer_requests_status_submittedAt_idx" ON "buyer_requests"("status","submittedAt");
ALTER TABLE "buyer_requests" ADD CONSTRAINT "buyer_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "buyer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_requests" ADD CONSTRAINT "buyer_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "buyer_request_lines" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "requestId" UUID NOT NULL,
 "position" INTEGER NOT NULL,
 "commodityId" UUID,
 "commodityName" VARCHAR(120) NOT NULL,
 "typeId" UUID,
 "specificationId" UUID,
 "variety" VARCHAR(120),
 "quantity" DECIMAL(18,3) NOT NULL,
 "unit" VARCHAR(30) NOT NULL,
 "quantityFlexible" BOOLEAN NOT NULL DEFAULT false,
 "packaging" VARCHAR(160),
 "qualityNotes" VARCHAR(1500),
 CONSTRAINT "buyer_request_lines_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "buyer_request_lines_quantity_positive" CHECK ("quantity" > 0 AND "quantity" <= 1000000000),
 CONSTRAINT "buyer_request_lines_unit_valid" CHECK ("unit" IN ('KG','TONNE','BAG','PIECE')),
 CONSTRAINT "buyer_request_lines_position_valid" CHECK ("position" >= 0 AND "position" < 5),
 CONSTRAINT "buyer_request_lines_name_nonblank" CHECK (length(trim("commodityName")) >= 2)
);
CREATE UNIQUE INDEX "buyer_request_lines_requestId_position_key" ON "buyer_request_lines"("requestId","position");
ALTER TABLE "buyer_request_lines" ADD CONSTRAINT "buyer_request_lines_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "buyer_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_request_lines" ADD CONSTRAINT "buyer_request_lines_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_request_lines" ADD CONSTRAINT "buyer_request_lines_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "commodity_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "buyer_request_lines" ADD CONSTRAINT "buyer_request_lines_specificationId_fkey" FOREIGN KEY ("specificationId") REFERENCES "commodity_specifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "buyer_request_events" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "requestId" UUID NOT NULL,
 "actorId" UUID NOT NULL,
 "kind" "BuyerRequestEventKind" NOT NULL,
 "status" "BuyerRequestStatus" NOT NULL,
 "note" VARCHAR(2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "buyer_request_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "buyer_request_events_requestId_createdAt_idx" ON "buyer_request_events"("requestId","createdAt");
ALTER TABLE "buyer_request_events" ADD CONSTRAINT "buyer_request_events_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "buyer_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_request_events" ADD CONSTRAINT "buyer_request_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "buyer_request_clarifications" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "requestId" UUID NOT NULL,
 "askedById" UUID NOT NULL,
 "question" VARCHAR(2000) NOT NULL,
 "answer" VARCHAR(2000),
 "answeredById" UUID,
 "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "answeredAt" TIMESTAMP(3),
 CONSTRAINT "buyer_request_clarifications_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "buyer_request_clarifications_answer_pair" CHECK (("answer" IS NULL AND "answeredAt" IS NULL AND "answeredById" IS NULL) OR ("answer" IS NOT NULL AND "answeredAt" IS NOT NULL AND "answeredById" IS NOT NULL))
);
CREATE INDEX "buyer_request_clarifications_requestId_askedAt_idx" ON "buyer_request_clarifications"("requestId","askedAt");
CREATE UNIQUE INDEX "buyer_request_clarifications_one_open_per_request" ON "buyer_request_clarifications"("requestId") WHERE "answeredAt" IS NULL;
ALTER TABLE "buyer_request_clarifications" ADD CONSTRAINT "buyer_request_clarifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "buyer_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_request_clarifications" ADD CONSTRAINT "buyer_request_clarifications_askedById_fkey" FOREIGN KEY ("askedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_request_clarifications" ADD CONSTRAINT "buyer_request_clarifications_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "buyer_request_assignments" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "requestId" UUID NOT NULL,
 "assignedToId" UUID NOT NULL,
 "assignedById" UUID NOT NULL,
 "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "dueAt" TIMESTAMP(3),
 CONSTRAINT "buyer_request_assignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "buyer_request_assignments_requestId_key" ON "buyer_request_assignments"("requestId");
CREATE INDEX "buyer_request_assignments_assignedToId_idx" ON "buyer_request_assignments"("assignedToId");
ALTER TABLE "buyer_request_assignments" ADD CONSTRAINT "buyer_request_assignments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "buyer_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_request_assignments" ADD CONSTRAINT "buyer_request_assignments_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyer_request_assignments" ADD CONSTRAINT "buyer_request_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Server-authorized Prisma access only. Never grant Data API access to sensitive buyer demand records.
ALTER TABLE "buyer_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buyer_request_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buyer_request_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buyer_request_clarifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buyer_request_assignments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "buyer_requests", "buyer_request_lines", "buyer_request_events", "buyer_request_clarifications", "buyer_request_assignments" FROM anon, authenticated;
