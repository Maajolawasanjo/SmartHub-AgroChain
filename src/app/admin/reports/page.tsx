import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceTable} from "@/components/dashboard/dashboard-ui";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {getPlatformReport,periodSchema} from "@/server/admin/reporting";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
function ngnMinor(v:string){
 const minor=BigInt(v);
 return "₦"+(minor/BigInt(100)).toLocaleString("en-NG")+"."+(minor%BigInt(100)).toString().padStart(2,"0");
}
export default async function GovernanceReports({searchParams}:{searchParams:Promise<{days?:string}>}){
 const ctx=await requireSuperAdminPage(),params=await searchParams;
 const period=periodSchema.safeParse(params.days).success?periodSchema.parse(params.days):"30";
 const report=await getPlatformReport(period);
 const stats=[
  {label:"Verified buyer payments",number:ngnMinor(report.finance.paidBuyerMinor),note:report.finance.paidBuyerObligations+" provider-confirmed NGN obligations in selected period"},
  {label:"Verified supplier transfers",number:ngnMinor(report.finance.supplierTransferMinor),note:report.finance.providerVerifiedSupplierTransfers+" currently settled Paystack-verified transfers in selected period"},
  {label:"Open financial reviews",number:String(report.risk.paymentReview+report.risk.supplierReview),note:"Buyer payment and farmer payout exceptions; current open state"},
  {label:"Open delivery disputes",number:String(report.risk.openDeliveryIssues),note:"Recorded unresolved physical delivery issues; current state"},
  {label:"Open support cases",number:String(report.risk.openSupport),note:"Customer support work requiring response"},
  {label:"Open governance incidents",number:String(report.risk.openGovernanceIncidents),note:"Unclosed investigations across all dates"}
 ];
 const groups=[
  {title:"Buyer sourcing requests",data:report.pipeline.buyerRequests},
  {title:"Official quotations",data:report.pipeline.quotations},
  {title:"Orders",data:report.pipeline.orders},
  {title:"Farmer verification",data:report.identities.farmerVerification}
 ];
 return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Operational Reporting & Financial Oversight"
 description="Authoritative account, sourcing, stock, provider-confirmed finance and exception summaries. No estimated transactions or synthetic revenue.">
 <div className="staff-page-links"><Link href="/admin">← Administration</Link><Link href="/admin/governance">Governance incidents</Link><Link href="/admin/users">Farmer & buyer directory</Link></div>
 <nav className="agro-toolbar" aria-label="Reporting period">
 {(["7","30","90"] as const).map(days=><Link key={days} className={"action "+(days===period?"action-primary":"action-outline")} href={"/admin/reports?days="+days}>Last {days} days</Link>)}
 <Link className="action action-outline" href={"/api/admin/reports/export?days="+period}>Export aggregate CSV</Link></nav>
 <p className="staff-meta-line">Selected period: {report.from.slice(0,16).replace("T"," ")} to {report.asOf.slice(0,16).replace("T"," ")} UTC. Financial totals are provider-verification evidence, not cash in the company's bank or accounting profit.</p>
 <div className="staff-dashboard-grid">{stats.map(stat=><section className="agro-panel" key={stat.label}><h2>{stat.label}</h2><div className="agro-number">{stat.number}</div><p>{stat.note}</p></section>)}</div>
 <section className="agro-panel"><h2>Accounts and supply integrity</h2>
 <div className="agro-grid"><p><strong>{report.identities.active}</strong> active accounts across all roles</p>
 <p><strong>{report.identities.buyerOrganizations}</strong> buyer organizations (all states)</p>
 <p><strong>{report.inventory.lots}</strong> physically evidenced supply lots</p>
 <p>Recorded physical quantity: <strong>{report.inventory.recordedQuantity}</strong></p>
 <p>Reserved physical quantity: <strong>{report.inventory.reservedQuantity}</strong></p>
 <p>Consumed physical quantity: <strong>{report.inventory.consumedQuantity}</strong></p></div>
 <p className="agro-hint">Supply lots may use different commodity units. Aggregate quantity across lots is shown solely as a ledger control, not as a common physical weight or inventory valuation.</p>
 </section>
 <section className="agro-panel"><h2>Exception and compliance work</h2>
 <div className="agro-grid">
 <p>Refund cases requiring resolution: <strong>{report.risk.refundReview}</strong></p>
 <p>Unreviewed field reports: <strong>{report.risk.submittedFieldVisits}</strong></p>
 <p>New governance incidents this period: <strong>{report.risk.newGovernanceIncidents}</strong></p>
 <p>Audit actions recorded this period: <strong>{report.risk.recentAuditEvents}</strong></p></div>
 <div className="agro-toolbar"><Link href="/admin/payments/refunds">Refund review</Link><Link href="/operations/disputes">Delivery disputes</Link><Link href="/admin/settlements">Supplier approvals</Link><Link href="/admin/audit">Audit trail</Link></div></section>
 <section className="agro-panel"><h2>Real account population</h2>
 <WorkspaceTable caption="Account role distribution" columns={["Role","Accounts"]}>
 <>{report.identities.byRole.map(r=><tr key={r.role}><td>{r.role.replaceAll("_"," ")}</td><td>{r.count}</td></tr>)}</></WorkspaceTable>
 </section>
 {groups.map(g=><section key={g.title} className="agro-panel"><h2>{g.title}</h2>
 <p>Current status distribution of records {g.title==="Farmer verification"?"across all dates":"created within the selected reporting period"}.</p>
 <WorkspaceTable caption={g.title+" by current status"} columns={["Recorded status","Count"]}>
 <>{g.data.map(v=><tr key={v.status}><td>{v.status.replaceAll("_"," ")}</td><td>{v.count}</td></tr>)}</></WorkspaceTable>
 </section>)}
 <section className="agro-panel"><h2>Daily Paystack-verified buyer obligations</h2>
 <WorkspaceTable caption="Day of provider-confirmed payment verification; NGN kobo recorded" columns={["UTC date","Verified obligations","Recorded amount"]}>
 <>{report.buyerDaily.map(row=><tr key={row.day}><td>{row.day}</td><td>{row.count}</td><td>{ngnMinor(row.amountMinor)}</td></tr>)}</></WorkspaceTable>
 {!report.buyerDaily.length&&<p>No independently verified buyer payments recorded during this period.</p>}
 </section>
 <div className="agro-alert">Do not compute platform profit by subtracting supplier transfers from buyer payments. These are separate event dates and exclude refunds, fees, taxes, costs, payable timing and settlement timing. Current-state review counts are not historical snapshots. CSV contains only aggregate records, no bank data or individual buyer identities.</div>
 </DashboardFrame>;
}
