-- Phase 04: staff governance, field-agent state scopes, invitation delivery reconciliation and audit details.
ALTER TYPE "InvitationStatus" ADD VALUE IF NOT EXISTS 'DELIVERY_FAILED';
ALTER TYPE "InvitationStatus" ADD VALUE IF NOT EXISTS 'DELIVERY_UNCERTAIN';
-- Apply only to the dedicated SmartHub AgroChain Supabase database after reviewing the migration plan.
ALTER TABLE "auth_audit_events" ADD COLUMN "details" JSONB;

CREATE TABLE "field_agent_assignments" (
  "id" UUID NOT NULL,
  "fieldAgentId" UUID NOT NULL,
  "state" VARCHAR(60) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "assignedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "field_agent_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "field_agent_assignments_nigeria_state_check" CHECK ("state" IN (
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River',
    'Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina',
    'Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau',
    'Rivers','Sokoto','Taraba','Yobe','Zamfara','FCT - Abuja'
  ))
);
CREATE UNIQUE INDEX "field_agent_assignments_fieldAgentId_state_key" ON "field_agent_assignments"("fieldAgentId","state");
CREATE INDEX "field_agent_assignments_fieldAgentId_active_idx" ON "field_agent_assignments"("fieldAgentId","active");
CREATE INDEX "field_agent_assignments_state_active_idx" ON "field_agent_assignments"("state","active");
CREATE INDEX "auth_audit_events_subjectId_createdAt_idx" ON "auth_audit_events"("subjectId","createdAt");
CREATE INDEX "staff_invitations_status_expiresAt_idx" ON "staff_invitations"("status","expiresAt");
-- Expired/failed invitations leave the active pending slot available for a new issue.
CREATE UNIQUE INDEX "staff_invitations_one_pending_email_key" ON "staff_invitations"(lower("email")) WHERE "status" = 'PENDING';

ALTER TABLE "field_agent_assignments" ADD CONSTRAINT "field_agent_assignments_fieldAgentId_fkey"
  FOREIGN KEY ("fieldAgentId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "field_agent_assignments" ADD CONSTRAINT "field_agent_assignments_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "field_agent_assignments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "field_agent_assignments" FROM anon, authenticated;
