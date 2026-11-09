import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {operationalFlags} from "@/server/admin/reporting";
import {getPrisma} from "@/server/db/prisma";
import {inspectCurrentPrivilegedMfaReadiness} from "@/server/admin/privileged-mfa-readiness";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function PlatformControls(){
 const ctx=await requireSuperAdminPage(),flags=operationalFlags();
 // Observations are read only; no factor IDs, account identities, or
 // platform secrets leave the server or affect the authorization guard.
 const [mfa,activeSuperAdminCount]=await Promise.all([
  inspectCurrentPrivilegedMfaReadiness(ctx.supabase.auth.mfa),
  getPrisma().account.count({where:{role:"SUPER_ADMIN",status:"ACTIVE"}}),
 ]);
 const assuranceLabel=mfa.currentLevel==="aal2"?"AAL2 observed in this session":mfa.currentLevel==="aal1"?"AAL1 — no second-factor challenge observed":"Provider assurance unavailable";
 const factorLabel=mfa.verifiedFactorCount===null?"Unable to verify factor enrollment":`${mfa.verifiedFactorCount} verified factor${mfa.verifiedFactorCount===1?"":"s"}`;

 const rows=[
  {label:"Buyer checkout launch gate",value:flags.buyerCheckoutEnabled?"Enabled in server environment":"Disabled in server environment",note:"A true flag does not replace provider verification or merchant approval."},
  {label:"Supplier transfer launch gate",value:flags.supplierPayoutEnabled?"Enabled in server environment":"Disabled in server environment",note:"A true flag does not authorize a transfer without separate approved controls."},
  {label:"Notifications",value:flags.operationalNotifications,note:"Email, SMS and push delivery are not configured or claimed."},
  {label:"Automated buyer refunds",value:flags.automatedRefunds,note:"Refund review cases do not automatically transfer money."},
  {label:"Backend database variable",value:flags.databaseConfigured?"Set":"Missing",note:"This does not verify network connectivity, migrations, RLS, backups or data health."}
 ];
 return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Platform Configuration & Release Gates" description="Read-only operational flags. Payment, payout, identity and security controls are never changed from a web dashboard.">
 <div className="staff-page-links"><Link href="/admin">← Administration</Link><Link href="/admin/permissions">Fixed permissions</Link><Link href="/admin/security/mfa">Authenticator security pilot</Link><Link href="/admin/governance">Governance incidents</Link></div>
 <section className="agro-panel"><h2>Server-controlled release boundaries</h2>
 {rows.map(row=><article key={row.label} className="agro-record"><div><strong>{row.label}</strong><p>{row.value}</p><p>{row.note}</p></div></article>)}</section>
 <section className="agro-panel" aria-labelledby="privileged-readiness-heading">
   <h2 id="privileged-readiness-heading">Privileged identity readiness — observation only</h2>
   <p>This checks the signed-in Super Admin's current Supabase session and verified MFA enrollment. It is not an MFA enrollment, recovery or privileged access approval screen.</p>
   <article className="agro-record"><div><strong>Current session authentication assurance</strong><p>{assuranceLabel}</p><p>{mfa.assessment==="SECOND_FACTOR_OBSERVED"?"An enrolled second factor and AAL2 were observed, but MFA is not yet enforced by privileged API guards.":mfa.assessment==="UNKNOWN"?"Security provider checks are unavailable. Readiness cannot be inferred.":"A completed second-factor challenge has not been confirmed for this session."}</p></div></article>
   <article className="agro-record"><div><strong>Verified MFA factors on this account</strong><p>{factorLabel}</p><p>Only the count is displayed. No MFA factor IDs, secrets, QR codes or phone numbers are exposed.</p></div></article>
   <article className="agro-record"><div><strong>Active Super Admin accounts</strong><p>{activeSuperAdminCount} account{activeSuperAdminCount===1?"":"s"} with the current SUPER_ADMIN role</p><p>The count does not verify the required two designated Super Admin responsibilities, independent approval or recovery arrangements.</p></div></article>
   <article className="agro-record"><div><strong>Privileged MFA enforcement policy</strong><p>Not activated — R00-D04 pending owner decision</p><p>Current session observations must not be treated as compliance. Privileged MFA enrollment, step-up and recovery need approved workflows and runtime enforcement before release.</p></div></article>
 </section>
 <div className="agro-alert">No secrets or environment variable values are exposed. The flags are informational, not live integrations or healthy migrations. Actual release requires Supabase staging tests, provider test transactions, least-privilege checks and stakeholder approval.</div>
 </DashboardFrame>;
}
