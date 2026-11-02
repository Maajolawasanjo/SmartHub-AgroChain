-- Phase 03: recovery-safe, server-authoritative public account intents and OTP attempt limits.
-- Requires earlier auth and agriculture migrations; never apply to another project's database.
CREATE TABLE "signup_intents" (
  "id" UUID NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "role" "AccountRole" NOT NULL,
  "fullName" VARCHAR(160) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "farmName" VARCHAR(160),
  "state" VARCHAR(60),
  "authUserId" UUID,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "signup_intents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "signup_intents_public_roles_only" CHECK ("role" IN ('BUYER','FARMER'))
);
CREATE UNIQUE INDEX "signup_intents_authUserId_key" ON "signup_intents"("authUserId");
CREATE INDEX "signup_intents_email_expiresAt_idx" ON "signup_intents"("email","expiresAt");
ALTER TABLE "phone_otp_throttles" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "phone_otp_throttles" ADD COLUMN "lockedUntil" TIMESTAMP(3);
ALTER TABLE "phone_otp_throttles" ADD COLUMN "targetPhone" VARCHAR(20);
ALTER TABLE "signup_intents" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "signup_intents" FROM anon, authenticated;
-- Operational requirement: delete expired intents as part of approved PII retention routine.
