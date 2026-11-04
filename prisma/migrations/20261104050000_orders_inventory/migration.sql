-- Phase 11: physical supply lots, pending-payment orders, reservation ledger.
-- No payment proof, checkout, settlement or fulfilment confirmation is implemented here.
CREATE TYPE "SupplyLotStatus" AS ENUM ('AVAILABLE','ON_HOLD');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT','CANCELLED','EXPIRED','PAYMENT_VERIFIED','FULFILLING','COMPLETED');
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE','RELEASED','CONSUMED');
CREATE TYPE "StockMovementKind" AS ENUM ('RECEIVED','RESERVED','RELEASED','CONSUMED');

CREATE TABLE "supply_lots" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "supplyId" UUID NOT NULL, "inspectionId" UUID NOT NULL, "createdById" UUID NOT NULL,
 "quantity" DECIMAL(18,3) NOT NULL, "reservedQuantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
 "consumedQuantity" DECIMAL(18,3) NOT NULL DEFAULT 0, "unit" VARCHAR(30) NOT NULL,
 "locationNote" VARCHAR(240) NOT NULL, "status" "SupplyLotStatus" NOT NULL DEFAULT 'AVAILABLE',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "supply_lots_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "supply_lots_inventory_invariant" CHECK ("quantity" > 0 AND "quantity" <= 1000000000 AND "reservedQuantity" >= 0 AND "consumedQuantity" >= 0 AND "reservedQuantity" + "consumedQuantity" <= "quantity"),
 CONSTRAINT "supply_lots_location_nonempty" CHECK (length(trim("locationNote")) >= 5)
);
CREATE UNIQUE INDEX "supply_lots_supplyId_key" ON "supply_lots"("supplyId");
CREATE INDEX "supply_lots_status_updatedAt_idx" ON "supply_lots"("status","updatedAt");
ALTER TABLE "supply_lots" ADD CONSTRAINT "supply_lots_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "supply_declarations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_lots" ADD CONSTRAINT "supply_lots_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "supply_inspection_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_lots" ADD CONSTRAINT "supply_lots_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "orders" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "reference" VARCHAR(40) NOT NULL,
 "quotationId" UUID NOT NULL, "revisionId" UUID NOT NULL, "organizationId" UUID NOT NULL,
 "createdById" UUID NOT NULL, "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
 "version" INTEGER NOT NULL DEFAULT 1, "holdExpiresAt" TIMESTAMP(3) NOT NULL,
 "cancelledAt" TIMESTAMP(3), "cancellationReason" VARCHAR(2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "orders_pkey" PRIMARY KEY ("id"), CONSTRAINT "orders_version_positive" CHECK ("version" > 0),
 CONSTRAINT "orders_reference_format" CHECK ("reference" ~ '^ORD-[0-9A-F]{32}$')
);
CREATE UNIQUE INDEX "orders_reference_key" ON "orders"("reference");
CREATE UNIQUE INDEX "orders_quotationId_key" ON "orders"("quotationId");
CREATE INDEX "orders_organizationId_status_createdAt_idx" ON "orders"("organizationId","status","createdAt");
CREATE INDEX "orders_status_holdExpiresAt_idx" ON "orders"("status","holdExpiresAt");
ALTER TABLE "orders" ADD CONSTRAINT "orders_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "quote_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "buyer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "order_lines" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "orderId" UUID NOT NULL,
 "quoteLineId" UUID NOT NULL, "lotId" UUID NOT NULL, "description" VARCHAR(180) NOT NULL,
 "quantity" DECIMAL(18,3) NOT NULL, "unit" VARCHAR(30) NOT NULL,
 "unitPriceNgn" DECIMAL(16,2) NOT NULL, "totalNgn" DECIMAL(18,2) NOT NULL,
 CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "order_lines_amount_valid" CHECK ("quantity" > 0 AND "unitPriceNgn" > 0 AND "totalNgn" > 0)
);
CREATE UNIQUE INDEX "order_lines_quoteLineId_key" ON "order_lines"("quoteLineId");
CREATE INDEX "order_lines_orderId_idx" ON "order_lines"("orderId");
CREATE INDEX "order_lines_lotId_idx" ON "order_lines"("lotId");
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_quoteLineId_fkey" FOREIGN KEY ("quoteLineId") REFERENCES "quote_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "supply_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "reservations" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "orderLineId" UUID NOT NULL,
 "lotId" UUID NOT NULL, "quantity" DECIMAL(18,3) NOT NULL, "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
 "expiresAt" TIMESTAMP(3) NOT NULL, "releasedAt" TIMESTAMP(3), "consumedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "reservations_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "reservations_quantity_positive" CHECK ("quantity" > 0),
 CONSTRAINT "reservations_terminal_exclusive" CHECK (NOT ("releasedAt" IS NOT NULL AND "consumedAt" IS NOT NULL)),
 CONSTRAINT "reservations_status_dates" CHECK (("status"='ACTIVE' AND "releasedAt" IS NULL AND "consumedAt" IS NULL) OR ("status"='RELEASED' AND "releasedAt" IS NOT NULL AND "consumedAt" IS NULL) OR ("status"='CONSUMED' AND "releasedAt" IS NULL AND "consumedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "reservations_orderLineId_key" ON "reservations"("orderLineId");
CREATE INDEX "reservations_lotId_status_idx" ON "reservations"("lotId","status");
CREATE INDEX "reservations_status_expiresAt_idx" ON "reservations"("status","expiresAt");
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "supply_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "stock_movements" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "lotId" UUID NOT NULL,
 "reservationId" UUID, "actorId" UUID NOT NULL, "kind" "StockMovementKind" NOT NULL,
 "quantity" DECIMAL(18,3) NOT NULL, "note" VARCHAR(1000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "stock_movements_positive" CHECK ("quantity" > 0),
 CONSTRAINT "stock_movements_reservation_link" CHECK (("kind" = 'RECEIVED' AND "reservationId" IS NULL) OR ("kind" <> 'RECEIVED' AND "reservationId" IS NOT NULL))
);
CREATE INDEX "stock_movements_lotId_createdAt_idx" ON "stock_movements"("lotId","createdAt");
CREATE INDEX "stock_movements_reservationId_createdAt_idx" ON "stock_movements"("reservationId","createdAt");
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "supply_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "order_status_events" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "orderId" UUID NOT NULL, "actorId" UUID NOT NULL,
 "status" "OrderStatus" NOT NULL, "note" VARCHAR(2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "order_status_events_orderId_createdAt_idx" ON "order_status_events"("orderId","createdAt");
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- New commercial, supplier and stock rows must not be accessible via untrusted Supabase Data API grants.
ALTER TABLE "supply_lots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_status_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "supply_lots","orders","order_lines","reservations","stock_movements","order_status_events" FROM anon, authenticated;
