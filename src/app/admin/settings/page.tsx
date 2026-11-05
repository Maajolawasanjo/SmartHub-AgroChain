import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {operationalFlags} from "@/server/admin/reporting";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function PlatformControls(){
 const ctx=await requireSuperAdminPage(),flags=operationalFlags();
 const rows=[
  {label:"Buyer checkout launch gate",value:flags.buyerCheckoutEnabled?"Enabled in server environment":"Disabled in server environment",note:"A true flag does not replace provider verification or merchant approval."},
  {label:"Supplier transfer launch gate",value:flags.supplierPayoutEnabled?"Enabled in server environment":"Disabled in server environment",note:"A true flag does not authorize a transfer without separate approved controls."},
  {label:"Notifications",value:flags.operationalNotifications,note:"Email, SMS and push delivery are not configured or claimed."},
  {label:"Automated buyer refunds",value:flags.automatedRefunds,note:"Refund review cases do not automatically transfer money."},
  {label:"Backend database variable",value:flags.databaseConfigured?"Set":"Missing",note:"This does not verify network connectivity, migrations, RLS, backups or data health."}
 ];
 return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Platform Configuration & Release Gates" description="Read-only operational flags. Payment, payout, identity and security controls are never changed from a web dashboard.">
 <div className="staff-page-links"><Link href="/admin">← Administration</Link><Link href="/admin/permissions">Fixed permissions</Link><Link href="/admin/governance">Governance incidents</Link></div>
 <section className="agro-panel"><h2>Server-controlled release boundaries</h2>
 {rows.map(row=><article key={row.label} className="agro-record"><div><strong>{row.label}</strong><p>{row.value}</p><p>{row.note}</p></div></article>)}</section>
 <div className="agro-alert">No secrets or environment variable values are exposed. The flags are informational, not live integrations or healthy migrations. Actual release requires Supabase staging tests, provider test transactions, least-privilege checks and stakeholder approval.</div>
 </DashboardFrame>;
}
