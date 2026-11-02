-- Phase 02 public product metadata, original content CMS fields, and protected enquiries.
-- No actual supply quantity, supplier identity, price, certification or stock is published by this migration.
-- Must run after the Phase 2 farmer/supply migration, on an approved SmartHub DB only.
CREATE TYPE "PublicEnquiryStatus" AS ENUM ('NEW','IN_REVIEW','CLOSED');

CREATE TABLE "commodity_categories" (
 "id" UUID NOT NULL, "slug" VARCHAR(90) NOT NULL, "name" VARCHAR(100) NOT NULL,
 "description" VARCHAR(900), "active" BOOLEAN NOT NULL DEFAULT TRUE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "commodity_categories_pkey" PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "commodity_categories_slug_key" ON "commodity_categories"("slug");
CREATE UNIQUE INDEX "commodity_categories_name_key" ON "commodity_categories"("name");

ALTER TABLE "commodities" ADD COLUMN "slug" VARCHAR(110),
 ADD COLUMN "description" VARCHAR(1200), ADD COLUMN "categoryId" UUID,
 ADD COLUMN "publicPublished" BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX "commodities_slug_key" ON "commodities"("slug");
CREATE INDEX "commodities_categoryId_publicPublished_active_idx" ON "commodities"("categoryId","publicPublished","active");
ALTER TABLE "commodities" ADD CONSTRAINT "commodities_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "commodity_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "commodity_types" (
 "id" UUID NOT NULL,"commodityId" UUID NOT NULL,"slug" VARCHAR(110) NOT NULL,
 "name" VARCHAR(120) NOT NULL,"standardizedName" VARCHAR(120),"marketName" VARCHAR(120),
 "description" VARCHAR(900), "publicPublished" BOOLEAN NOT NULL DEFAULT FALSE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "commodity_types_pkey" PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "commodity_types_commodityId_slug_key" ON "commodity_types"("commodityId","slug");
ALTER TABLE "commodity_types" ADD CONSTRAINT "commodity_types_commodityId_fkey" FOREIGN KEY("commodityId") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "commodity_specifications" (
 "id" UUID NOT NULL,"commodityId" UUID NOT NULL,"name" VARCHAR(120) NOT NULL,
 "description" VARCHAR(900),"unit" VARCHAR(40),
 "publicPublished" BOOLEAN NOT NULL DEFAULT FALSE,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "commodity_specifications_pkey" PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "commodity_specifications_commodityId_name_key" ON "commodity_specifications"("commodityId","name");
ALTER TABLE "commodity_specifications" ADD CONSTRAINT "commodity_specifications_commodityId_fkey" FOREIGN KEY("commodityId") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "insight_articles" (
 "id" UUID NOT NULL,"slug" VARCHAR(140) NOT NULL,"title" VARCHAR(180) NOT NULL,
 "summary" VARCHAR(550) NOT NULL,"body" TEXT NOT NULL,"category" VARCHAR(80) NOT NULL,
 "published" BOOLEAN NOT NULL DEFAULT FALSE,"publishedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "insight_articles_pkey" PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "insight_articles_slug_key" ON "insight_articles"("slug");
CREATE INDEX "insight_articles_published_publishedAt_idx" ON "insight_articles"("published","publishedAt");

CREATE TABLE "public_enquiries" (
 "id" UUID NOT NULL,"fullName" VARCHAR(160) NOT NULL,"email" VARCHAR(254) NOT NULL,
 "phone" VARCHAR(24),"organisation" VARCHAR(180),"audience" VARCHAR(32) NOT NULL,
 "subject" VARCHAR(180) NOT NULL,"message" VARCHAR(4000) NOT NULL,"productSlug" VARCHAR(110),
 "senderHash" VARCHAR(64) NOT NULL,"status" "PublicEnquiryStatus" NOT NULL DEFAULT 'NEW',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "public_enquiries_pkey" PRIMARY KEY("id")
);
CREATE INDEX "public_enquiries_status_createdAt_idx" ON "public_enquiries"("status","createdAt");
CREATE INDEX "public_enquiries_senderHash_createdAt_idx" ON "public_enquiries"("senderHash","createdAt");

CREATE TABLE "public_contact_throttles" (
 "senderHash" VARCHAR(64) NOT NULL,"windowStart" TIMESTAMP(3) NOT NULL,"count" INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT "public_contact_throttles_pkey" PRIMARY KEY("senderHash"),
 CONSTRAINT "public_contact_throttles_count_check" CHECK ("count" >= 0)
);

-- All these tables are server-only; database-backed publication is performed by trusted server handlers.
ALTER TABLE "commodity_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commodity_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commodity_specifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "insight_articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public_enquiries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public_contact_throttles" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "commodity_categories","commodity_types","commodity_specifications","insight_articles","public_enquiries","public_contact_throttles" FROM anon,authenticated;
