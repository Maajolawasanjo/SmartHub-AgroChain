-- Phase 16: Super Admin-only, reason-coded governance incident tracking.
-- No financial, inventory, payment, staff role or fulfilment status mutation is delegated here.
CREATE TYPE "GovernanceIncidentCategory" AS ENUM ('ACCESS','FINANCIAL_EXCEPTION','SOURCING','DELIVERY','COMPLIANCE','SYSTEM');
CREATE TYPE "GovernanceIncidentSeverity" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "GovernanceIncidentStatus" AS ENUM ('OPEN','INVESTIGATING','MITIGATED','CLOSED');
CREATE TYPE "GovernanceSubjectType" AS ENUM ('ACCOUNT','ORDER','BUYER_PAYMENT','SUPPLIER_OBLIGATION','SHIPMENT','SUPPORT_CASE');

CREATE TABLE "governance_incidents" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "clientKey" UUID NOT NULL,
 "reference" VARCHAR(40) NOT NULL,
 "category" "GovernanceIncidentCategory" NOT NULL,
 "severity" "GovernanceIncidentSeverity" NOT NULL,
 "status" "GovernanceIncidentStatus" NOT NULL DEFAULT 'OPEN',
 "version" INTEGER NOT NULL DEFAULT 1,
 "title" VARCHAR(180) NOT NULL,
 "description" VARCHAR(2000) NOT NULL,
 "subjectType" "GovernanceSubjectType",
 "subjectId" UUID,
 "openedById" UUID NOT NULL,
 "assignedToId" UUID,
 "closedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "governance_incidents_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "governance_incidents_reference" CHECK("reference" ~ '^INC-[0-9A-F]{32}$'),
 CONSTRAINT "governance_incidents_version" CHECK("version">=1),
 CONSTRAINT "governance_incidents_text" CHECK(length(trim("title"))>=8 AND length(trim("description"))>=20),
 CONSTRAINT "governance_incidents_subject_pair" CHECK(
  ("subjectType" IS NULL AND "subjectId" IS NULL) OR ("subjectType" IS NOT NULL AND "subjectId" IS NOT NULL))
);
CREATE UNIQUE INDEX "governance_incidents_clientKey_key" ON "governance_incidents"("clientKey");
CREATE UNIQUE INDEX "governance_incidents_reference_key" ON "governance_incidents"("reference");
CREATE INDEX "governance_incidents_status_severity_createdAt_idx" ON "governance_incidents"("status","severity","createdAt");
CREATE INDEX "governance_incidents_subjectType_subjectId_idx" ON "governance_incidents"("subjectType","subjectId");
ALTER TABLE "governance_incidents" ADD CONSTRAINT "governance_incidents_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "governance_incidents" ADD CONSTRAINT "governance_incidents_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "governance_incident_events" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "incidentId" UUID NOT NULL,
 "actorId" UUID NOT NULL,
 "fromStatus" "GovernanceIncidentStatus",
 "toStatus" "GovernanceIncidentStatus" NOT NULL,
 "reasonCode" VARCHAR(60) NOT NULL,
 "note" VARCHAR(1500) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "governance_incident_events_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "governance_incident_event_note" CHECK(length(trim("note"))>=12),
 CONSTRAINT "governance_incident_event_reason" CHECK(length(trim("reasonCode"))>=3)
);
CREATE INDEX "governance_incident_events_incidentId_createdAt_idx" ON "governance_incident_events"("incidentId","createdAt");
ALTER TABLE "governance_incident_events" ADD CONSTRAINT "governance_incident_events_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "governance_incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "governance_incident_events" ADD CONSTRAINT "governance_incident_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "governance_incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "governance_incident_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "governance_incidents","governance_incident_events" FROM anon, authenticated;
