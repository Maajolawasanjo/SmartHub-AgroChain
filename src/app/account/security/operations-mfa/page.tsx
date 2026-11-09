import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/server/auth/context";
import { operationsMfaPilotEnabled, operationsMfaEnforcementEnabled } from "@/server/operations/mfa-policy";

import { inspectCurrentPrivilegedMfaReadiness } from "@/server/admin/privileged-mfa-readiness";
import { PrivilegedMfaPilotConsole } from "@/features/auth/components/privileged-mfa-pilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/**
 * Operations AAL1 staff must be able to complete a challenge without
 * entering the protected /operations layout. This cannot grant authority.
 */
export default async function OperationsAuthenticatorStepUpPage() {
  const ctx = await getAccountContext();
  if (!ctx) redirect("/login");
  if (ctx.account.status !== "ACTIVE") redirect("/account/status");
  if (!ctx.user.email_confirmed_at) redirect("/verify-email");
  if (ctx.account.role !== "OPERATIONS") redirect("/forbidden");

  const enabled = operationsMfaPilotEnabled();
  const enforcementOn = operationsMfaEnforcementEnabled();
  const [readiness, factors] = enabled
    ? await Promise.all([
        inspectCurrentPrivilegedMfaReadiness(ctx.supabase.auth.mfa),
        ctx.supabase.auth.mfa.listFactors(),
      ])
    : [null, null] as const;

  const available = Boolean(enabled && readiness && factors && !factors.error && factors.data?.all);
  const all = available && factors?.data?.all ? factors.data.all : [];
  const choices = (state: "verified" | "unverified") => all
    .filter(factor => factor.factor_type === "totp" && factor.status === state)
    .map((factor, index) => ({
      id: factor.id,
      label: factor.friendly_name || `Authenticator ${index + 1}`,
    }));

  return <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
    <div className="mb-7 space-y-3">
      <Link href="/login" className="underline">Sign in with another account</Link>
      <h1 className="text-3xl font-semibold">Secure your Operations session</h1>
      <p className="text-base leading-7">
        This is a dedicated authenticator setup and sign-in challenge area.
        Completing MFA strengthens your verified session; it never grants extra roles or financial authority.
      </p>
      <p className="text-sm">
        {enforcementOn
          ? "A completed second-factor challenge is required before continuing to the Operations workspace."
          : "Mandatory second-factor enforcement is not active. This security pilot remains approval-gated."}
      </p>
    </div>
    {!enabled
      ? <section className="agro-panel">
          <h2>Authenticator setup is not active</h2>
          <p>R00-D01/D04 Operations MFA policy approval and the server pilot release gate are still required. Your account has not been changed.</p>
          <p>If you have lost access to an existing authenticator, contact the designated security administrators. This page does not reset or remove verified factors.</p>
        </section>
      : !available || !readiness
        ? <section className="agro-panel">
            <h2>Authenticator provider could not be checked</h2>
            <p>We cannot verify the current factors. Access does not advance; try again or contact approved support. No factor will be removed automatically.</p>
          </section>
        : <PrivilegedMfaPilotConsole
            verifiedFactors={choices("verified")}
            pendingFactors={choices("unverified")}
            assurance={readiness.currentLevel}
            endpointBase="/api/account/security/operations-mfa"
          />}
    <div className="mt-6 space-y-3">
      <p className="text-sm">Lost your device? Do not delete or recreate the administrator account. The recovery policy requires independently authorized review and a full audit trail.</p>
      <Link href="/account/help" className="underline">Account recovery guidance</Link>
      {" · "}
      <Link href="/operations" className="underline">Try Operations workspace</Link>
    </div>
  </main>;
}
