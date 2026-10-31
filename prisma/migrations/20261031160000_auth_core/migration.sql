-- Core identity/access-only migration. Requires a dedicated SmartHub Supabase project.
-- Apply with Prisma migrate deploy after reviewing environment and backing up the database.
CREATE TYPE "AccountRole" AS ENUM ('BUYER','FARMER','FIELD_AGENT','OPERATIONS','SUPER_ADMIN');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE','SUSPENDED','DISABLED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING','ACCEPTED','REVOKED','EXPIRED');
CREATE TYPE "DeletionStatus" AS ENUM ('REQUESTED','UNDER_REVIEW','DENIED','COMPLETED','CANCELLED');

CREATE TABLE "app_accounts" (
 "id" UUID NOT NULL, "role" "AccountRole" NOT NULL, "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
 "email" VARCHAR(254) NOT NULL, "fullName" VARCHAR(160) NOT NULL, "phone" VARCHAR(20) NOT NULL,
 "phoneVerifiedAt" TIMESTAMP(3), "pendingPhone" VARCHAR(20), "farmName" VARCHAR(160), "state" VARCHAR(60),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "app_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "app_accounts_email_key" ON "app_accounts"("email");

CREATE TABLE "phone_otp_throttles" (
 "accountId" UUID NOT NULL, "lastRequestedAt" TIMESTAMP(3) NOT NULL,
 "windowStartedAt" TIMESTAMP(3) NOT NULL, "countInWindow" INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT "phone_otp_throttles_pkey" PRIMARY KEY("accountId")
);
CREATE TABLE "staff_invitations" (
 "id" UUID NOT NULL, "email" VARCHAR(254) NOT NULL, "role" "AccountRole" NOT NULL,
 "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING', "invitedUserId" UUID,
 "invitedById" UUID NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "acceptedAt" TIMESTAMP(3),
 CONSTRAINT "staff_invitations_pkey" PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "staff_invitations_invitedUserId_key" ON "staff_invitations"("invitedUserId");
CREATE INDEX "staff_invitations_email_status_idx" ON "staff_invitations"("email","status");

CREATE TABLE "account_deletion_requests" (
 "id" UUID NOT NULL, "accountId" UUID NOT NULL, "status" "DeletionStatus" NOT NULL DEFAULT 'REQUESTED',
 "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reviewedAt" TIMESTAMP(3),
 CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "account_deletion_requests_accountId_status_idx" ON "account_deletion_requests"("accountId","status");

CREATE TABLE "auth_audit_events" (
 "id" UUID NOT NULL, "actorId" UUID NOT NULL, "action" VARCHAR(90) NOT NULL,
 "subjectId" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "auth_audit_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "auth_audit_events_actorId_createdAt_idx" ON "auth_audit_events"("actorId","createdAt");

ALTER TABLE "phone_otp_throttles" ADD CONSTRAINT "phone_otp_throttles_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "app_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth_audit_events" ADD CONSTRAINT "auth_audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- These tables are accessed by the trusted Next.js/Prisma server, not by client Data API queries.
-- In exposed schemas, RLS and revocation defend against accidental REST exposure.
ALTER TABLE "app_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phone_otp_throttles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account_deletion_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_audit_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "app_accounts", "phone_otp_throttles", "staff_invitations", "account_deletion_requests", "auth_audit_events" FROM anon, authenticated;
