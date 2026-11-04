-- Phase 13: managed split fulfilment, evidence-backed delivery, buyer receipts and shortages.
-- Private server-owned Prisma APIs. Shipment evidence lives in a PRIVATE Storage bucket.
CREATE TYPE "FulfillmentStatus" AS ENUM ('ACTIVE','REVIEW_REQUIRED','COMPLETED');
CREATE TYPE "ShipmentStatus" AS ENUM ('PLANNED','PICKED_UP','IN_TRANSIT','DELIVERED','RECEIVED','PARTIAL_RECEIPT','ISSUE_REPORTED','CANCELLED');
CREATE TYPE "DeliveryEventKind" AS ENUM ('PLAN_CREATED','SHIPMENT_PLANNED','PICKUP_CONFIRMED','DISPATCH_CONFIRMED','DELIVERY_REPORTED','BUYER_RECEIPT','SHORTAGE_REPORTED','ISSUE_REVIEWED','SHIPMENT_CANCELLED');
CREATE TYPE "ReceiptStatus" AS ENUM ('COMPLETE','PARTIAL');
CREATE TYPE "DeliveryIssueStatus" AS ENUM ('OPEN','UNDER_REVIEW','RESOLUTION_REQUIRED');
CREATE TYPE "ShipmentEvidenceStatus" AS ENUM ('UPLOADING','READY','FAILED');

CREATE TABLE "fulfillment_plans" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "orderId" UUID NOT NULL, "createdById" UUID NOT NULL,
 "status" "FulfillmentStatus" NOT NULL DEFAULT 'ACTIVE',
 "destinationState" VARCHAR(60) NOT NULL, "destinationCity" VARCHAR(120) NOT NULL,
 "destinationAddress" VARCHAR(240) NOT NULL, "method" VARCHAR(40) NOT NULL,
 "handlingNote" VARCHAR(1000), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "fulfillment_plans_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "fulfillment_plans_destination_valid" CHECK(length(trim("destinationState")) >= 2 AND length(trim("destinationCity")) >= 2 AND length(trim("destinationAddress")) >= 8)
);
CREATE UNIQUE INDEX "fulfillment_plans_orderId_key" ON "fulfillment_plans"("orderId");
CREATE INDEX "fulfillment_plans_status_updatedAt_idx" ON "fulfillment_plans"("status","updatedAt");
ALTER TABLE "fulfillment_plans" ADD CONSTRAINT "fulfillment_plans_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fulfillment_plans" ADD CONSTRAINT "fulfillment_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "shipments" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "planId" UUID NOT NULL,
 "reference" VARCHAR(40) NOT NULL, "status" "ShipmentStatus" NOT NULL DEFAULT 'PLANNED',
 "carrierName" VARCHAR(160) NOT NULL, "carrierContact" VARCHAR(80),
 "vehicleNote" VARCHAR(160), "trackingReference" VARCHAR(120),
 "pickupAt" TIMESTAMP(3), "dispatchAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "shipments_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "shipments_reference_format" CHECK("reference" ~ '^SHP-[0-9A-F]{32}$'),
 CONSTRAINT "shipments_carrier_name" CHECK(length(trim("carrierName"))>=2)
);
CREATE UNIQUE INDEX "shipments_reference_key" ON "shipments"("reference");
CREATE INDEX "shipments_planId_status_createdAt_idx" ON "shipments"("planId","status","createdAt");
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "fulfillment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "shipment_lines" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "shipmentId" UUID NOT NULL,
 "orderLineId" UUID NOT NULL, "quantity" DECIMAL(18,3) NOT NULL,
 CONSTRAINT "shipment_lines_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "shipment_lines_quantity_valid" CHECK("quantity">0 AND "quantity"<=1000000000)
);
CREATE UNIQUE INDEX "shipment_lines_shipmentId_orderLineId_key" ON "shipment_lines"("shipmentId","orderLineId");
CREATE INDEX "shipment_lines_orderLineId_idx" ON "shipment_lines"("orderLineId");
ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "shipment_evidence" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "shipmentId" UUID NOT NULL,
 "uploadedById" UUID NOT NULL, "objectPath" VARCHAR(500) NOT NULL,
 "originalName" VARCHAR(180) NOT NULL, "contentType" VARCHAR(80) NOT NULL,
 "sizeBytes" INTEGER NOT NULL, "status" "ShipmentEvidenceStatus" NOT NULL DEFAULT 'UPLOADING',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "shipment_evidence_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "shipment_evidence_size_valid" CHECK("sizeBytes">0 AND "sizeBytes"<=10485760),
 CONSTRAINT "shipment_evidence_type_valid" CHECK("contentType" IN ('image/jpeg','image/png','image/webp','application/pdf'))
);
CREATE UNIQUE INDEX "shipment_evidence_objectPath_key" ON "shipment_evidence"("objectPath");
CREATE INDEX "shipment_evidence_shipmentId_status_createdAt_idx" ON "shipment_evidence"("shipmentId","status","createdAt");
ALTER TABLE "shipment_evidence" ADD CONSTRAINT "shipment_evidence_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_evidence" ADD CONSTRAINT "shipment_evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "delivery_events" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "shipmentId" UUID NOT NULL,
 "actorId" UUID NOT NULL, "kind" "DeliveryEventKind" NOT NULL,
 "note" VARCHAR(2000), "evidenceId" UUID,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "delivery_events_evidenceId_key" ON "delivery_events"("evidenceId");
CREATE INDEX "delivery_events_shipmentId_createdAt_idx" ON "delivery_events"("shipmentId","createdAt");
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "shipment_evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "receipt_confirmations" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "shipmentId" UUID NOT NULL,
 "buyerId" UUID NOT NULL, "status" "ReceiptStatus" NOT NULL,
 "note" VARCHAR(2000), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "receipt_confirmations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "receipt_confirmations_shipmentId_key" ON "receipt_confirmations"("shipmentId");
CREATE INDEX "receipt_confirmations_buyerId_createdAt_idx" ON "receipt_confirmations"("buyerId","createdAt");
ALTER TABLE "receipt_confirmations" ADD CONSTRAINT "receipt_confirmations_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipt_confirmations" ADD CONSTRAINT "receipt_confirmations_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "receipt_lines" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "receiptId" UUID NOT NULL,
 "shipmentLineId" UUID NOT NULL,
 "acceptedQuantity" DECIMAL(18,3) NOT NULL, "shortageQuantity" DECIMAL(18,3) NOT NULL,
 CONSTRAINT "receipt_lines_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "receipt_lines_quantities_valid" CHECK ("acceptedQuantity">=0 AND "shortageQuantity">=0)
);
CREATE UNIQUE INDEX "receipt_lines_shipmentLineId_key" ON "receipt_lines"("shipmentLineId");
CREATE INDEX "receipt_lines_receiptId_idx" ON "receipt_lines"("receiptId");
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipt_confirmations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_shipmentLineId_fkey" FOREIGN KEY ("shipmentLineId") REFERENCES "shipment_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "delivery_issues" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "shipmentId" UUID NOT NULL,
 "reportedById" UUID NOT NULL, "reviewedById" UUID,
 "status" "DeliveryIssueStatus" NOT NULL DEFAULT 'OPEN',
 "category" VARCHAR(40) NOT NULL, "description" VARCHAR(2000) NOT NULL,
 "reviewNote" VARCHAR(2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "delivery_issues_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "delivery_issues_description_valid" CHECK(length(trim("description"))>=15)
);
CREATE UNIQUE INDEX "delivery_issues_shipmentId_key" ON "delivery_issues"("shipmentId");
CREATE INDEX "delivery_issues_status_createdAt_idx" ON "delivery_issues"("status","createdAt");
ALTER TABLE "delivery_issues" ADD CONSTRAINT "delivery_issues_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_issues" ADD CONSTRAINT "delivery_issues_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_issues" ADD CONSTRAINT "delivery_issues_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Private storage bucket, no browser access through public bucket / blanket policies.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('shipment-evidence','shipment-evidence',false,10485760,
 ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

ALTER TABLE "fulfillment_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shipments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shipment_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shipment_evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipt_confirmations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipt_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_issues" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "fulfillment_plans","shipments","shipment_lines","delivery_events",
 "shipment_evidence","receipt_confirmations","receipt_lines","delivery_issues" FROM anon, authenticated;
