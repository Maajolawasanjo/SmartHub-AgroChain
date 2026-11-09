/**
 * Operations-only TOTP pilot endpoint. AAL1 accessibility is intentional:
 * staff must be able to enroll or challenge without entering the AAL2-gated
 * Operations portal. Never changes role, money or account-recovery policy.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAccountContext } from "@/server/auth/context";
import { PublicError, assertSameOrigin, errorReply, readJson, reply, requireConfig } from "@/server/auth/http";
import { verifyCurrentPassword } from "@/server/auth/reauth";
import { ownTotpFactor } from "@/server/admin/privileged-mfa-pilot";
import { operationsMfaPilotEnabled } from "@/server/operations/mfa-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const codeInput = z.strictObject({
  factorId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, "Enter the current six-digit authenticator code."),
});
const passwordInput = z.strictObject({
  currentPassword: z.string().min(1).max(256),
});
const cancelInput = passwordInput.extend({
  factorId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  try {
    assertSameOrigin(request);
    requireConfig();
    const ctx = await getAccountContext();
    if (!ctx) throw new PublicError(401, "Sign in to continue.");
    if (ctx.account.status !== "ACTIVE" || !ctx.user.email_confirmed_at ||
        ctx.account.role !== "OPERATIONS")
      throw new PublicError(403, "Active Operations staff access is required.");

    // Changing a deployment flag cannot activate Operations MFA before
    // the separately approved R00-D01/D04 rollout record exists.
    if (!operationsMfaPilotEnabled())
      throw new PublicError(503, "Authenticator setup is not available until the Operations MFA pilot is approved.");

    const { action } = await context.params;
    const input = await readJson(request, 1024);
    const mfa = ctx.supabase.auth.mfa;
    if (action === "enroll") {
      const { currentPassword } = passwordInput.parse(input);
      if (!ctx.user.email) throw new PublicError(403, "Verified account email is required.");
      await verifyCurrentPassword(ctx.user.email, currentPassword, ctx.user.id);
      const known = await mfa.listFactors();
      if (known.error || !known.data?.all) throw new PublicError(503, "Unable to verify current authenticator factors.");
      if (known.data.all.some(f => f.status === "unverified" && f.factor_type === "totp"))
        throw new PublicError(409, "Finish or cancel the existing authenticator enrollment first.");
      if (known.data.all.some(f => f.status === "verified" && f.factor_type === "totp")) {
        const assurance = await mfa.getAuthenticatorAssuranceLevel();
        if (assurance.error || assurance.data?.currentLevel !== "aal2")
          throw new PublicError(403, "Confirm your existing authenticator before adding a backup factor.");
      }
      const enrolled = await mfa.enroll({ factorType: "totp", friendlyName: "SmartHub Operations Authenticator" });
      if (enrolled.error || !enrolled.data?.totp?.secret)
        throw new PublicError(503, "Unable to start authenticator enrollment. Try again.");
      // A one-time secret is only returned to the requesting user's no-store
      // HTTPS response. Never persist, log, cache, or include it in a URL.
      return reply({
        ok: true,
        factorId: enrolled.data.id,
        setupSecret: enrolled.data.totp.secret,
        message: "Add this setup key to your authenticator, then confirm its six-digit code.",
      }, 201);
    }

    if (action === "verify-enrollment" || action === "step-up") {
      const { factorId, code } = codeInput.parse(input);
      const known = await mfa.listFactors();
      if (known.error || !known.data?.all)
        throw new PublicError(503, "Unable to verify your authenticator factor.");
      const requiredState = action === "verify-enrollment" ? "unverified" : "verified";
      if (!ownTotpFactor(known.data.all, factorId, requiredState))
        throw new PublicError(404, "Authenticator factor not found for this account.");
      const verified = await mfa.challengeAndVerify({ factorId, code });
      if (verified.error || !verified.data)
        throw new PublicError(403, "Authenticator code was not accepted. Try a current code.");
      return reply({
        ok: true,
        message: action === "verify-enrollment"
          ? "Authenticator verified. Other sessions may require a fresh sign-in."
          : "Second-factor challenge completed for this session.",
      });
    }

    if (action === "cancel-pending") {
      const { currentPassword, factorId } = cancelInput.parse(input);
      if (!ctx.user.email) throw new PublicError(403, "Verified account email is required.");
      await verifyCurrentPassword(ctx.user.email, currentPassword, ctx.user.id);
      const known = await mfa.listFactors();
      if (known.error || !known.data?.all)
        throw new PublicError(503, "Unable to verify the pending authenticator.");
      if (!ownTotpFactor(known.data.all, factorId, "unverified"))
        throw new PublicError(404, "Pending authenticator factor not found.");
      // Never unenroll a verified factor in this pilot. Recovery and verified
      // factor removal need a separately approved two-person workflow.
      const cancelled = await mfa.unenroll({ factorId });
      if (cancelled.error)
        throw new PublicError(503, "Unable to cancel pending enrollment.");
      return reply({ ok: true, message: "Unverified authenticator enrollment cancelled." });
    }

    throw new PublicError(404, "Unsupported authenticator action.");
  } catch (error) {
    return errorReply(error);
  }
}
