-- Phase 05: scoped field visits, evidence metadata and Operations review.
-- Apply only to the dedicated SmartHub AgroChain Supabase project after review.

CREATE TYPE "FieldVisitStatus" AS ENUM ('DRAFT','IN_PROGRESS','SUBMITTED','REVIEWED','RETURNED','CANCELLED');
CREATE TYPE "FieldVisitPurpose" AS ENUM ('FARMER_VERIFICATION','FARM_ASSESSMENT','CROP_ASSESSMENT','PRODUCTION_OBSERVATION');
CREATE TYPE "FieldVisitReviewDecision" AS ENUM ('ACCEPT_REPORT','RETURN_FOR_CHANGES');
CREATE TYPE "FieldVisitEventType" AS ENUM ('CREATED','STARTED','UPDATED','SUBMITTED','ACCEPTED','RETURNED','CANCELLED','EVIDENCE_ADDED','EVIDENCE_REMOVED');
CREATE TYPE "FieldVisitEvidenceStatus" AS ENUM ('UPLOADING','READY','FAILED','DELETING');

-- Composite FK prevents a visit from pairing a farmer with another farmer's farm.
CREATE UNIQUE INDEX "farms_id_farmerId_key" ON "farms"("id","farmerId");
CREATE INDEX "farms_state_createdAt_idx" ON "farms"("state","createdAt");

CREATE TABLE "field_visits" (
  "id" UUID NOT NULL,
  "fieldAgentId" UUID NOT NULL,
  "farmerId" UUID NOT NULL,
  "farmId" UUID NOT NULL,
  "purpose" "FieldVisitPurpose" NOT NULL,
  "status" "FieldVisitStatus" NOT NULL DEFAULT 'DRAFT',
  "visitDate" DATE NOT NULL,
  "farmerPresent" BOOLEAN,
  "cropObservations" VARCHAR(3000),
  "productionObservations" VARCHAR(3000),
  "fieldNotes" VARCHAR(5000),
  "followUpRequired" BOOLEAN NOT NULL DEFAULT FALSE,
  "followUpNotes" VARCHAR(2000),
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" UUID,
  "reviewDecision" "FieldVisitReviewDecision",
  "reviewerNote" VARCHAR(2000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "field_visits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "field_visits_fieldAgentId_fkey" FOREIGN KEY ("fieldAgentId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "field_visits_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "field_visits_farmId_farmerId_fkey" FOREIGN KEY ("farmId","farmerId") REFERENCES "farms"("id","farmerId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "field_visits_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "field_visits_followup_note_check" CHECK ("followUpRequired" = FALSE OR length(trim(coalesce("followUpNotes",''))) >= 5),
  CONSTRAINT "field_visits_review_state_check" CHECK (
    ("status" IN ('REVIEWED','RETURNED') AND "reviewDecision" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "reviewedById" IS NOT NULL AND length(trim(coalesce("reviewerNote",''))) >= 8)
    OR
    ("status" NOT IN ('REVIEWED','RETURNED') AND "reviewDecision" IS NULL AND "reviewedAt" IS NULL AND "reviewedById" IS NULL AND "reviewerNote" IS NULL)
  ),
  CONSTRAINT "field_visits_review_decision_status_check" CHECK (
    ("status"='REVIEWED' AND "reviewDecision"='ACCEPT_REPORT') OR
    ("status"='RETURNED' AND "reviewDecision"='RETURN_FOR_CHANGES') OR
    ("status" NOT IN ('REVIEWED','RETURNED') AND "reviewDecision" IS NULL)
  )
);
CREATE INDEX "field_visits_fieldAgentId_status_createdAt_idx" ON "field_visits"("fieldAgentId","status","createdAt");
CREATE INDEX "field_visits_farmerId_createdAt_idx" ON "field_visits"("farmerId","createdAt");
CREATE INDEX "field_visits_farmId_createdAt_idx" ON "field_visits"("farmId","createdAt");
CREATE INDEX "field_visits_status_submittedAt_idx" ON "field_visits"("status","submittedAt");

CREATE TABLE "field_visit_evidence" (
  "id" UUID NOT NULL,
  "visitId" UUID NOT NULL,
  "uploadedById" UUID NOT NULL,
  "objectPath" VARCHAR(500) NOT NULL,
  "originalName" VARCHAR(180) NOT NULL,
  "contentType" VARCHAR(80) NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "caption" VARCHAR(500),
  "status" "FieldVisitEvidenceStatus" NOT NULL DEFAULT 'UPLOADING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "field_visit_evidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "field_visit_evidence_objectPath_key" UNIQUE ("objectPath"),
  CONSTRAINT "field_visit_evidence_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "field_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "field_visit_evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "field_visit_evidence_size_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 10485760),
  CONSTRAINT "field_visit_evidence_mime_check" CHECK ("contentType" IN ('image/jpeg','image/png','image/webp','application/pdf'))
);
CREATE INDEX "field_visit_evidence_visitId_status_createdAt_idx" ON "field_visit_evidence"("visitId","status","createdAt");

CREATE TABLE "field_visit_events" (
  "id" UUID NOT NULL,
  "visitId" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "eventType" "FieldVisitEventType" NOT NULL,
  "status" "FieldVisitStatus" NOT NULL,
  "note" VARCHAR(2000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "field_visit_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "field_visit_events_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "field_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "field_visit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "field_visit_events_visitId_createdAt_idx" ON "field_visit_events"("visitId","createdAt");
CREATE INDEX "field_visit_events_actorId_createdAt_idx" ON "field_visit_events"("actorId","createdAt");

ALTER TABLE "field_visits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "field_visit_evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "field_visit_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "field_visits" FROM anon, authenticated;
REVOKE ALL ON TABLE "field_visit_evidence" FROM anon, authenticated;
REVOKE ALL ON TABLE "field_visit_events" FROM anon, authenticated;

-- Evidence remains private. The application uses server-only service credentials after checking
-- the active Field Agent state scope or Operations review permission. No client object policy is added.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('field-visit-evidence','field-visit-evidence',FALSE,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public=FALSE, file_size_limit=10485760,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','application/pdf'];
