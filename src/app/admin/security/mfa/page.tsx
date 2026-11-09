import Link from "next/link";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";
import { requireSuperAdminPage } from "@/server/admin/guard";
import { privilegedMfaPilotEnabled } from "@/server/admin/privileged-mfa-pilot";
import { inspectCurrentPrivilegedMfaReadiness } from "@/server/admin/privileged-mfa-readiness";
import { PrivilegedMfaPilotConsole } from "@/features/auth/components/privileged-mfa-pilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function SuperAdminMfaPilotPage() {
  const ctx = await requireSuperAdminPage();
  const enabled = privilegedMfaPilotEnabled();
  // No MFA or factor lookups are performed before explicit owner and
  // deployment-gate approval. Existing sign-in behavior remains unchanged.
  const [readiness, factors] = enabled
    ? await Promise.all([
        inspectCurrentPrivilegedMfaReadiness(ctx.supabase.auth.mfa),
        ctx.supabase.auth.mfa.listFactors(),
      ])
    : [null, null] as const;

  const available = Boolean(enabled && readiness && factors && !factors.error && factors.data?.all);
  const all = available && factors?.data?.all ? factors.data.all : [];
  const safeFactors = (state: "verified" | "unverified") => all
    .filter(f => f.factor_type === "totp" && f.status === state)
    .map((f, index) => ({ id: f.id, label: f.friendly_name || `Authenticator ${index + 1}` }));

  return <DashboardFrame
    role="SUPER_ADMIN"
    name={ctx.account.fullName}
    title="Authenticator Security"
    description="An approval-gated authenticator setup and session step-up pilot. It does not grant extra permissions."
  >
    <div className="staff-page-links">
      <Link href="/admin/settings">← Platform settings</Link>
      <Link href="/admin/account">Account security</Link>
    </div>
    {!enabled
      ? <section className="agro-panel">
          <h2>Authenticator pilot is not active</h2>
          <p>Enrollment and second-factor challenges are disabled until the owner approves R00-D04 and the server release flag is explicitly enabled. No account factors or existing sessions have been changed.</p>
          <p>Approved rollout must include support for lost authenticator access, session recovery, the two designated Super Admin responsibilities, and independent financial authority.</p>
        </section>
      : !available || !readiness
        ? <section className="agro-panel">
            <h2>Authenticator provider unavailable</h2>
            <p>Current Supabase Auth factor status could not be verified. Enrollment and challenges remain unavailable rather than displaying an unsupported security claim.</p>
          </section>
        : <PrivilegedMfaPilotConsole
            verifiedFactors={safeFactors("verified")}
            pendingFactors={safeFactors("unverified")}
            assurance={readiness.currentLevel}
          />}
    <div className="agro-alert">This pilot does not yet enforce AAL2 at login, Admin APIs, privileged actions, financial decisions or recovery. Source tests do not replace real provider enrollment and revocation acceptance tests.</div>
  </DashboardFrame>;
}
