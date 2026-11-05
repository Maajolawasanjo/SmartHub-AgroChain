-- Phase 07: explicit Operations review ownership and evidence-backed supply assessment.
-- Apply only to a dedicated SmartHub Supabase project after the prior migrations.
CREATE TYPE "OperationsReviewKind" AS ENUM ('FARMER_VERIFICATION', 'SUPPLY_DECLARATION');

CREATE TABLE "operations_review_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kind" "OperationsReviewKind" NOT NULL,
  "subjectId" UUID NOT NULL,
  "assignedToId" UUID NOT NULL,
  "assignedById" UUID NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operations_review_assignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "operations_review_assignments_kind_subjectId_key"
  ON "operations_review_assignments"("kind", "subjectId");
CREATE INDEX "operations_review_assignments_assignedToId_kind_idx"
  ON "operations_review_assignments"("assignedToId", "kind");
ALTER TABLE "operations_review_assignments"
  ADD CONSTRAINT "operations_review_assignments_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operations_review_assignments"
  ADD CONSTRAINT "operations_review_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "supply_inspection_assessments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supplyId" UUID NOT NULL,
  "reviewerId" UUID NOT NULL,
  "evidenceVisitId" UUID NOT NULL,
  "observedQuantity" DECIMAL(18,3) NOT NULL,
  "observedUnit" VARCHAR(30) NOT NULL,
  "conditionNote" VARCHAR(2000) NOT NULL,
  "specificationId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supply_inspection_assessments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supply_inspection_assessments_quantity_positive" CHECK ("observedQuantity" > 0),
  CONSTRAINT "supply_inspection_assessments_unit_valid" CHECK ("observedUnit" IN ('KG','TONNE','BAG','PIECE')),
  CONSTRAINT "supply_inspection_assessments_note_length" CHECK (length(trim("conditionNote")) >= 20)
);
CREATE INDEX "supply_inspection_assessments_supplyId_createdAt_idx"
  ON "supply_inspection_assessments"("supplyId", "createdAt");
CREATE INDEX "supply_inspection_assessments_evidenceVisitId_idx"
  ON "supply_inspection_assessments"("evidenceVisitId");
ALTER TABLE "supply_inspection_assessments"
  ADD CONSTRAINT "supply_inspection_assessments_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "supply_declarations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_inspection_assessments"
  ADD CONSTRAINT "supply_inspection_assessments_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_inspection_assessments"
  ADD CONSTRAINT "supply_inspection_assessments_evidenceVisitId_fkey" FOREIGN KEY ("evidenceVisitId") REFERENCES "field_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supply_inspection_assessments"
  ADD CONSTRAINT "supply_inspection_assessments_specificationId_fkey" FOREIGN KEY ("specificationId") REFERENCES "commodity_specifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Application routes use server-authorized Prisma transactions; never expose case assignments or inspections through the Data API.
ALTER TABLE "operations_review_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supply_inspection_assessments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "operations_review_assignments", "supply_inspection_assessments" FROM anon, authenticated;
