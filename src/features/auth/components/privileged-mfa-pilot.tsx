"use client";

import { useState, type FormEvent } from "react";

type Factor = { id: string; label: string };
type Result = {
  ok?: boolean;
  error?: string;
  message?: string;
  factorId?: string;
  setupSecret?: string;
};

async function action(name: string, input: Record<string, unknown>): Promise<Result> {
  const response = await fetch(`/api/admin/security/mfa/${name}`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json() as Result;
  if (!response.ok || !result.ok)
    throw new Error(result.error || "Authenticator request failed.");
  return result;
}

/**
 * R01.3D.2 pilot UI — rendered only when both explicit owner approval and
 * the server-side launch gate are present. No provider secret is persisted to
 * localStorage, cookies, analytics, URLs, or query parameters.
 */
export function PrivilegedMfaPilotConsole({
  verifiedFactors,
  pendingFactors,
  assurance,
}: {
  verifiedFactors: Factor[];
  pendingFactors: Factor[];
  assurance: "aal1" | "aal2" | "unknown";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifiedId, setVerifiedId] = useState(verifiedFactors[0]?.id || "");
  const [pendingId, setPendingId] = useState(pendingFactors[0]?.id || "");
  const [setup, setSetup] = useState<{ factorId: string; secret: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>, name: string, payload: Record<string, unknown>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await action(name, payload);
      setNotice(result.message || "Authenticator request completed.");
      if (name === "enroll") {
        if (!result.factorId || !result.setupSecret) throw new Error("Setup could not be completed.");
        setSetup({ factorId: result.factorId, secret: result.setupSecret });
        setPendingId(result.factorId);
        setPassword("");
      } else {
        setCode("");
        setPassword("");
        setSetup(null);
        window.location.reload();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to complete the request.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-5">
    <div className="agro-panel">
      <h2>Authenticator session</h2>
      <p>Current assurance: <strong>{assurance.toUpperCase()}</strong>. This is a pilot and does not yet enforce MFA on every privileged API or page.</p>
      <p>Verified authenticator apps: <strong>{verifiedFactors.length}</strong>. Pending enrollments: <strong>{pendingFactors.length}</strong>.</p>
      {assurance === "aal2" && <p className="agro-alert">A second-factor challenge was observed for this session. Independent financial and privileged approvals are still governed separately.</p>}
    </div>

    {verifiedFactors.length > 0 && assurance !== "aal2" &&
      <section className="agro-panel" aria-labelledby="mfa-step-up-heading">
        <h2 id="mfa-step-up-heading">Confirm your existing authenticator</h2>
        <p>Enter a fresh six-digit code to complete a second-factor challenge. This does not grant additional permissions.</p>
        <form className="auth-form" onSubmit={e => submit(e, "step-up", { factorId: verifiedId, code })}>
          <label className="auth-label" htmlFor="mfa-verified-factor">Authenticator</label>
          <select id="mfa-verified-factor" className="auth-input" value={verifiedId} onChange={e => setVerifiedId(e.target.value)}>
            {verifiedFactors.map((factor, index) => <option key={factor.id} value={factor.id}>{factor.label || `Authenticator ${index + 1}`}</option>)}
          </select>
          <label className="auth-label" htmlFor="mfa-stepup-code">Six-digit authenticator code</label>
          <input className="auth-input" id="mfa-stepup-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}/>
          <button className="auth-submit" type="submit" disabled={busy || code.length !== 6 || !verifiedId}>{busy ? "Checking…" : "Verify second factor"}</button>
        </form>
      </section>}

    <section className="agro-panel" aria-labelledby="mfa-enroll-heading">
      <h2 id="mfa-enroll-heading">{verifiedFactors.length > 0 ? "Add a backup authenticator" : "Set up an authenticator app"}</h2>
      <p>Confirm your current password before creating a one-time setup key. If you already have an authenticator, an AAL2 session is required before adding another.</p>
      {pendingFactors.length > 0 && <p className="agro-alert">You have a pending enrollment. Finish or cancel it before starting another.</p>}
      <form className="auth-form" onSubmit={e => submit(e, "enroll", { currentPassword: password })}>
        <label className="auth-label" htmlFor="mfa-current-password">Current account password</label>
        <input className="auth-input" id="mfa-current-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required maxLength={256}/>
        <button className="auth-submit" disabled={busy || !password || pendingFactors.length > 0 || (verifiedFactors.length > 0 && assurance !== "aal2")} type="submit">{busy ? "Preparing…" : "Create authenticator setup"}</button>
      </form>
      {setup && <div className="mt-5 rounded-xl border border-current/15 p-4" role="group" aria-label="One-time authenticator setup key">
        <p><strong>One-time setup key</strong> — enter this in your authenticator app. Do not share it or save it in screenshots.</p>
        <code className="mt-3 block break-all select-all rounded-lg bg-black/5 p-3 text-sm dark:bg-white/10">{setup.secret}</code>
        <p className="mt-3">After adding the key, enter its current code in the pending-enrollment form below. This key is not stored in the browser after a reload.</p>
      </div>}
    </section>

    {(pendingFactors.length > 0 || setup) &&
      <section className="agro-panel" aria-labelledby="mfa-pending-heading">
        <h2 id="mfa-pending-heading">Finish or cancel pending enrollment</h2>
        <p>Use the six-digit code from the authenticator app configured with this enrollment. If you no longer have its setup key, cancel it and start over.</p>
        <form className="auth-form" onSubmit={e => submit(e, "verify-enrollment", { factorId: pendingId, code })}>
          {pendingFactors.length > 0 && <><label className="auth-label" htmlFor="mfa-pending-factor">Pending authenticator</label>
            <select className="auth-input" id="mfa-pending-factor" value={pendingId} onChange={e => setPendingId(e.target.value)}>
              {pendingFactors.map((factor, index) => <option value={factor.id} key={factor.id}>{factor.label || `Pending authenticator ${index + 1}`}</option>)}
              {setup && !pendingFactors.some(f => f.id === setup.factorId) && <option value={setup.factorId}>Just created authenticator</option>}
            </select></>}
          <label className="auth-label" htmlFor="mfa-enroll-code">Six-digit authenticator code</label>
          <input className="auth-input" id="mfa-enroll-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} required onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}/>
          <button className="auth-submit" disabled={busy || code.length !== 6 || !pendingId} type="submit">{busy ? "Verifying…" : "Verify and activate authenticator"}</button>
        </form>
        <form className="auth-form mt-5" onSubmit={e => submit(e, "cancel-pending", { factorId: pendingId, currentPassword: password })}>
          <label className="auth-label" htmlFor="mfa-cancel-password">Current password to cancel unverified enrollment</label>
          <input className="auth-input" id="mfa-cancel-password" type="password" autoComplete="current-password" maxLength={256} required value={password} onChange={e => setPassword(e.target.value)}/>
          <button className="auth-submit auth-secondary-submit" disabled={busy || !pendingId || !password} type="submit">Cancel pending enrollment</button>
        </form>
      </section>}
    {error && <p role="alert" className="agro-alert">{error}</p>}
    {notice && <p role="status" className="agro-alert">{notice}</p>}
  </div>;
}
