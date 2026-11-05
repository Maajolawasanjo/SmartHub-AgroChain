-- Phase 15: transactional in-app notification ledger and private support conversations.
-- Notification delivery is IN_APP only. No email, SMS or push provider is configured.
CREATE TYPE "NotificationCategory" AS ENUM ('PROCUREMENT','FINANCE','LOGISTICS','SUPPORT','SECURITY');
CREATE TYPE "OutboxDeliveryChannel" AS ENUM ('IN_APP');
CREATE TYPE "OutboxDeliveryStatus" AS ENUM ('DELIVERED','SKIPPED');
CREATE TYPE "SupportCaseStatus" AS ENUM ('OPEN','IN_PROGRESS','AWAITING_CUSTOMER','RESOLVED','CLOSED');
CREATE TYPE "SupportCaseCategory" AS ENUM ('SOURCING','PAYMENTS','DELIVERY','SUPPLIER_SETTLEMENT','ACCOUNT','OTHER');

CREATE TABLE "outbox_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventKey" VARCHAR(180) NOT NULL, "eventType" VARCHAR(80) NOT NULL,
  "actorId" UUID, "subjectId" UUID, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbox_event_key_nonempty" CHECK(length(trim("eventKey"))>0)
);
CREATE UNIQUE INDEX "outbox_events_eventKey_key" ON "outbox_events"("eventKey");
CREATE INDEX "outbox_events_eventType_createdAt_idx" ON "outbox_events"("eventType","createdAt");
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "eventId" UUID NOT NULL,
  "accountId" UUID NOT NULL, "category" "NotificationCategory" NOT NULL,
  "title" VARCHAR(160) NOT NULL, "body" VARCHAR(1000) NOT NULL,
  "actionPath" VARCHAR(400) NOT NULL, "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_path_safe" CHECK(
    left("actionPath",1)='/' AND left("actionPath",2)<>'//' AND
    "actionPath" !~ '[?#\\]' AND "actionPath" !~ '(^|/)\.\.(/|$)'
  )
);
CREATE UNIQUE INDEX "notifications_eventId_accountId_key" ON "notifications"("eventId","accountId");
CREATE INDEX "notifications_accountId_readAt_createdAt_idx" ON "notifications"("accountId","readAt","createdAt");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "outbox_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "notification_delivery_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "eventId" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "channel" "OutboxDeliveryChannel" NOT NULL DEFAULT 'IN_APP',
  "status" "OutboxDeliveryStatus" NOT NULL DEFAULT 'DELIVERED',
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_delivery_attempts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_delivery_attempts_eventId_accountId_channel_key" ON "notification_delivery_attempts"("eventId","accountId","channel");
CREATE INDEX "notification_delivery_attempts_accountId_createdAt_idx" ON "notification_delivery_attempts"("accountId","createdAt");
ALTER TABLE "notification_delivery_attempts" ADD CONSTRAINT "notification_delivery_attempts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "outbox_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_delivery_attempts" ADD CONSTRAINT "notification_delivery_attempts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "notification_preferences" (
  "accountId" UUID NOT NULL,
  "procurement" BOOLEAN NOT NULL DEFAULT true,
  "finance" BOOLEAN NOT NULL DEFAULT true,
  "logistics" BOOLEAN NOT NULL DEFAULT true,
  "support" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("accountId")
);
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "support_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reference" VARCHAR(40) NOT NULL,
  "openedById" UUID NOT NULL, "assignedToId" UUID,
  "category" "SupportCaseCategory" NOT NULL,
  "subject" VARCHAR(160) NOT NULL,
  "status" "SupportCaseStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "support_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_cases_reference_check" CHECK("reference" ~ '^SUP-[0-9A-F]{32}$')
);
CREATE UNIQUE INDEX "support_cases_reference_key" ON "support_cases"("reference");
CREATE INDEX "support_cases_openedById_status_updatedAt_idx" ON "support_cases"("openedById","status","updatedAt");
CREATE INDEX "support_cases_assignedToId_status_updatedAt_idx" ON "support_cases"("assignedToId","status","updatedAt");
CREATE INDEX "support_cases_status_createdAt_idx" ON "support_cases"("status","createdAt");
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "app_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "support_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "caseId" UUID NOT NULL, "authorId" UUID NOT NULL, "body" VARCHAR(4000) NOT NULL,
  "internal" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_message_body_valid" CHECK(length(trim("body")) BETWEEN 1 AND 4000)
);
CREATE INDEX "support_messages_caseId_createdAt_idx" ON "support_messages"("caseId","createdAt");
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "support_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "app_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_delivery_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_messages" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "outbox_events","notifications","notification_delivery_attempts",
 "notification_preferences","support_cases","support_messages" FROM anon, authenticated;
