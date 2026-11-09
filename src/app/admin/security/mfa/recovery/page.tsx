import Link from "next/link";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";
import { requireSuperAdminPage } from "@/server/admin/guard";
import { privilegedMfaEnforcementEnabled } from "@/server/admin/privileged-mfa-enforcement";
import { operationsMfaEnforcementEnabled } from "@/server/operations/mfa-policy";
import decisions from "../../../../../../docs/implementation/r00-gates.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const required = [
  { id: "R00-D01", title: "Admin topology and authoritative account ownership",
    explanation: "Confirm which system owns the current role, Auth identity and recovery audit." },
  { id: "R00-D04", title: "Privileged MFA and two-officer lost-factor recovery",
    explanation: "Identify independently designated officers, identity proof, incident procedure, and tested revocation." },
  { id: "R00-D09", title: "Independent financial approval authority",
    explanation: "MFA cannot grant the ability to act as both maker and checker of a financial action." },
] as const;

/**
 * Read-only governance status; this page deliberately has no submit control,
 * recovery execution endpoint, OTP input, factor IDs or service-role actions.
 */
export default async function PrivilegedMfaRecoveryReadinessPage() {
  const ctx = await requireSuperAdminPage();
  const rows = required.map(item => {
    const recorded = decisions.gates.find(g => g.id === item.id);
    const approved = recorded?.status === "APPROVED" &&
      Boolean(recorded.decision_record_ref && recorded.approved_by && recorded.approved_at);
    return { ...item, approved, status: approved ? "Approved decision recorded" : "Owner decision pending" };
  });
  const administrative = privilegedMfaEnforcementEnabled();
  const operations = operationsMfaEnforcementEnabled();

  return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName}
      title="Authenticator Recovery Governance"
      description="Read-only owner decisions, recovery process and security acceptance. This page cannot recover an identity or remove a factor.">
    <div className="staff-page-links">
      <Link href="/admin/security/mfa">← Authenticator security</Link>
      <Link href="/admin/settings">Platform release gates</Link>
      <Link href="/admin/governance">Recorded governance incidents</Link>
    </div>
    <section className="agro-panel">
      <h2>Owner decisions required before any recovery rollout</h2>
      {rows.map(row => <article className="agro-record" key={row.id}>
        <div><strong>{row.id} · {row.title}</strong>
          <p>{row.status}</p><p>{row.explanation}</p>
        </div>
      </article>)}
    </section>
    <section className="agro-panel">
      <h2>Runtime enforcement observation</h2>
      <p>Super Admin enforcement: <strong>{administrative ? "Release gate enabled" : "Not activated"}</strong></p>
      <p>Operations enforcement: <strong>{operations ? "Release gate enabled" : "Not activated"}</strong></p>
      <p>A server release flag is not proof of successful AAL2 tests, recovery, officer designation, or signed financial segregation.</p>
    </section>
    <section className="agro-panel">
      <h2>Two-officer recovery — design only</h2>
      <p>Independent identity re-verification, a time-limited versioned request, two distinct active designated officers with verified sessions, append-only audit, replay protection and safe session revocation must all be implemented and tested before execution is allowed.</p>
      <p>Only a non-executable preflight and a disabled private-ledger schema draft currently exist. No verified factor reset, emergency bypass, or recovery execution endpoint is available here.</p>
    </section>
    <section className="agro-panel">
      <h2>Lost your authenticator?</h2>
      <p>Open an account support case without attempting to bypass MFA. Do not delete, replace or share verified factor secrets. Use the independent recovery procedure once designated and approved.</p>
      <Link href="/support" className="action action-outline">Open a support case</Link>
    </section>
    <p className="agro-alert">No operator can approve a policy or a recovery by viewing this screen. Production activation requires separate written owner decisions, live staging evidence, and independently reviewed deployment controls.</p>
  </DashboardFrame>;
}
