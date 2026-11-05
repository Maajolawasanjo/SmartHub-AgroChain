-- Phase 10: managed procurement candidate matching, invited farmer interest, controlled NGN quotations.
-- No money capture, contract of sale, physical lot, stock reservation or buyer/farmer contact sharing.
CREATE TYPE "MatchStatus" AS ENUM ('CANDIDATE','INVITED','INTERESTED','DECLINED','CLOSED');
CREATE TYPE "OpportunityResponse" AS ENUM ('INTERESTED','DECLINED');
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT','PENDING_APPROVAL','REJECTED','APPROVED','ISSUED','ACCEPTED','DECLINED','EXPIRED');
CREATE TYPE "QuoteEventKind" AS ENUM ('DRAFT_SAVED','APPROVAL_REQUESTED','CHANGES_REQUESTED','APPROVED','ISSUED','ACCEPTED','DECLINED','EXPIRED');

CREATE TABLE "match_proposals" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "requestLineId" UUID NOT NULL, "supplyId" UUID NOT NULL, "createdById" UUID NOT NULL,
 "quantity" DECIMAL(18,3) NOT NULL, "unit" VARCHAR(30) NOT NULL,
 "status" "MatchStatus" NOT NULL DEFAULT 'CANDIDATE',
 "note" VARCHAR(1000), "invitedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "match_proposals_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "match_proposals_quantity_valid" CHECK ("quantity" > 0 AND "quantity" <= 1000000000)
);
CREATE UNIQUE INDEX "match_proposals_requestLineId_supplyId_key" ON "match_proposals"("requestLineId","supplyId");
CREATE INDEX "match_proposals_status_createdAt_idx" ON "match_proposals"("status","createdAt");
CREATE INDEX "match_proposals_supplyId_status_idx" ON "match_proposals"("supplyId","status");
ALTER TABLE "match_proposals" ADD CONSTRAINT "match_proposals_requestLineId_fkey" FOREIGN KEY ("requestLineId") REFERENCES "buyer_request_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_proposals" ADD CONSTRAINT "match_proposals_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "supply_declarations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_proposals" ADD CONSTRAINT "match_proposals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "opportunity_interests" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "matchId" UUID NOT NULL, "farmerId" UUID NOT NULL,
 "response" "OpportunityResponse" NOT NULL, "note" VARCHAR(1000),
 "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "opportunity_interests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "opportunity_interests_matchId_key" ON "opportunity_interests"("matchId");
CREATE INDEX "opportunity_interests_farmerId_respondedAt_idx" ON "opportunity_interests"("farmerId","respondedAt");
ALTER TABLE "opportunity_interests" ADD CONSTRAINT "opportunity_interests_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "match_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opportunity_interests" ADD CONSTRAINT "opportunity_interests_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "quotations" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "requestId" UUID NOT NULL, "createdById" UUID NOT NULL,
 "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
 "version" INTEGER NOT NULL DEFAULT 1, "currentRevision" INTEGER NOT NULL DEFAULT 1,
 "buyerDecidedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "quotations_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "quotations_version_positive" CHECK ("version" > 0 AND "currentRevision" > 0)
);
CREATE UNIQUE INDEX "quotations_requestId_key" ON "quotations"("requestId");
CREATE INDEX "quotations_status_updatedAt_idx" ON "quotations"("status","updatedAt");
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "buyer_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "quote_revisions" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "quoteId" UUID NOT NULL, "number" INTEGER NOT NULL,
 "createdById" UUID NOT NULL, "terms" VARCHAR(4000) NOT NULL, "validUntil" TIMESTAMP(3) NOT NULL,
 "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN', "totalNgn" DECIMAL(18,2) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "issuedAt" TIMESTAMP(3),
 CONSTRAINT "quote_revisions_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "quote_revisions_positive" CHECK ("number" > 0 AND "totalNgn" > 0),
 CONSTRAINT "quote_revisions_ngn_only" CHECK ("currency" = 'NGN')
);
CREATE UNIQUE INDEX "quote_revisions_quoteId_number_key" ON "quote_revisions"("quoteId","number");
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "quote_lines" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "revisionId" UUID NOT NULL, "requestLineId" UUID NOT NULL, "matchId" UUID NOT NULL,
 "description" VARCHAR(180) NOT NULL, "quantity" DECIMAL(18,3) NOT NULL,
 "unit" VARCHAR(30) NOT NULL, "unitPriceNgn" DECIMAL(16,2) NOT NULL, "totalNgn" DECIMAL(18,2) NOT NULL,
 CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "quote_lines_positive" CHECK ("quantity" > 0 AND "unitPriceNgn" > 0 AND "totalNgn" > 0)
);
CREATE UNIQUE INDEX "quote_lines_revisionId_requestLineId_key" ON "quote_lines"("revisionId","requestLineId");
CREATE INDEX "quote_lines_matchId_idx" ON "quote_lines"("matchId");
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "quote_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_requestLineId_fkey" FOREIGN KEY ("requestLineId") REFERENCES "buyer_request_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "match_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "quote_approval_events" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "revisionId" UUID NOT NULL, "actorId" UUID NOT NULL,
 "kind" "QuoteEventKind" NOT NULL, "note" VARCHAR(2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "quote_approval_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quote_approval_events_revisionId_createdAt_idx" ON "quote_approval_events"("revisionId","createdAt");
ALTER TABLE "quote_approval_events" ADD CONSTRAINT "quote_approval_events_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "quote_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quote_approval_events" ADD CONSTRAINT "quote_approval_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- All private commercial tables are accessed only through server-authorized Prisma.
ALTER TABLE "match_proposals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "opportunity_interests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_approval_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "match_proposals","opportunity_interests","quotations","quote_revisions","quote_lines","quote_approval_events" FROM anon, authenticated;
