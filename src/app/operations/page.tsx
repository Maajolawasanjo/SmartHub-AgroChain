import Link from "next/link";
import {PortalFrame,requirePortal} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export default async function OperationsDashboard(){
 const {account,db}=await requirePortal("OPERATIONS");
 const [farmers,supply,commodities,fieldReports,buyerDemand]=await Promise.all([
 db.farmerVerification.count({where:{status:"PENDING_REVIEW"}}),
 db.supplyDeclaration.count({where:{status:"PENDING_REVIEW"}}),
 db.commodity.count({where:{active:true}}),
 db.fieldVisit.count({where:{status:"SUBMITTED"}}),
 db.buyerRequest.count({where:{status:"SUBMITTED"}})
 ]);
 return <PortalFrame name={account.fullName} role="OPERATIONS" route="/operations" title="Operations Dashboard" subtitle="Review actual farmer and agricultural supply records. Matching, quotations and payments are separate future modules.">
 <div className="agro-grid">
  <section className="agro-panel"><h2>New buyer sourcing requests</h2><div className="agro-number">{buyerDemand}</div><p>Submitted buyer requirements awaiting assessment</p><Link className="action action-primary" href="/operations/requests">Review demand</Link></section>
  <section className="agro-panel"><h2>Farmer verification queue</h2><div className="agro-number">{farmers}</div><p>Awaiting staff decisions</p><Link className="action action-primary" href="/operations/verification">Open queue</Link></section>
  <section className="agro-panel"><h2>Supply review queue</h2><div className="agro-number">{supply}</div><p>Farmer-submitted declarations</p><Link className="action action-primary" href="/operations/supply">Review supply</Link></section>
  <section className="agro-panel"><h2>Supported commodities</h2><div className="agro-number">{commodities}</div><p>Active official catalog items</p><Link className="action action-outline" href="/operations/catalog">Manage catalog</Link></section>
  <section className="agro-panel"><h2>Field reports awaiting review</h2><div className="agro-number">{fieldReports}</div><p>Submitted by Field Agents; not farmer or supply approvals</p><Link className="action action-outline" href="/operations/field-visits">Review field reports</Link></section>
 </div>
 <div className="agro-toolbar"><Link className="action action-primary" href="/operations/matching">Supply matching & quotations</Link></div>
 <div className="agro-alert">Approval only permits consideration for later matching. It does not reserve quantity, guarantee quality, generate a quote, create an order or settle funds.</div>
 </PortalFrame>;
}
