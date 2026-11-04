import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceCard,WorkspaceEmpty,StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
import {buyerProfileCompletion} from "@/lib/buyer/profile";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerDashboard(){
 const {account,db}=await requireBuyerPage();const member=await buyerMembership(db,account.id);
 const profile=member?.organization??null;const completion=buyerProfileCompletion(profile);
 const [saved,destinations,activeRequests,recentRequests,issuedQuotes,pendingOrders,openObligations]=member?await Promise.all([
  db.buyerSavedSpecification.count({where:{organizationId:member.organizationId}}),
  db.buyerDeliveryDestination.count({where:{organizationId:member.organizationId}}),
  db.buyerRequest.count({where:{organizationId:member.organizationId,status:{in:["SUBMITTED","UNDER_REVIEW","MORE_INFO_REQUIRED","SOURCING_IN_PROGRESS"]}}}),
  db.buyerRequest.findMany({where:{organizationId:member.organizationId},orderBy:{updatedAt:"desc"},take:4,include:{lines:{orderBy:{position:"asc"},take:2}}}),
  db.quotation.count({where:{status:"ISSUED",request:{organizationId:member.organizationId}}}),
  db.order.count({where:{organizationId:member.organizationId,status:"PENDING_PAYMENT"}}),
  db.paymentObligation.count({where:{organizationId:member.organizationId,status:"UNPAID"}})
 ]):[0,0,0,[],0,0,0];
 const metrics=[{title:"Active Requests",value:String(activeRequests),detail:"Submitted or under assessment"},
  {title:"Quotes Awaiting Decision",value:String(issuedQuotes),detail:"Issued official quotes awaiting buyer action"},
  {title:"Orders Pending Payment",value:String(pendingOrders),detail:"Recorded orders with provisional source reservations; payment is not yet available"},
  {title:"Open Payment Obligations",value:String(openObligations),detail:"Actual provider-backed obligations, not estimated transactions"}];
 return <DashboardFrame role="BUYER" name={account.fullName} title={`Welcome back, ${account.fullName}`} description="Your agricultural procurement overview.">
 <section className="buyer-hero"><div><span className="buyer-kicker">BUYER PORTAL</span><h2>Procurement starts with the right requirements.</h2><p>Tell SmartHub what your business needs, then track Operations assessment and clarification. A request is not an order or supply guarantee.</p></div><Link href={completion.complete?"/dashboard/requests/new":"/dashboard/settings"} className="action action-primary">{completion.complete?"Start a Buyer Request":"Complete Business Profile"}</Link></section>
 <div className="buyer-metrics">{metrics.map(m=><section className="buyer-metric" key={m.title}><h3>{m.title}</h3><div className={m.value===null?"buyer-metric-pending":"buyer-metric-value"} aria-label={m.value===null?"Metric not available":undefined}>{m.value??"—"}</div><p>{m.detail}</p></section>)}</div>
 {!completion.complete?<section className="buyer-alert"><h2>Needs Your Attention</h2><p>Your business profile has {completion.missing.length} required field{completion.missing.length===1?"":"s"} remaining: {completion.missing.join(", ")}. You may save a request draft, but must complete these fields before submitting.</p><Link href="/dashboard/settings" className="action action-primary">Continue profile setup</Link></section>:<section className="buyer-alert buyer-alert--ready"><h2>Ready to submit sourcing requests</h2><p>Your required business details are saved. This is not independent business verification, which is not a universal prerequisite for initial requests.</p><StatusPill status={profile?.verificationStatus??"NOT_REQUESTED"}/></section>}
 <div className="buyer-panel-grid"><WorkspaceCard title="Your procurement setup" description="Live information from your own organization."><dl className="buyer-facts"><div><dt>Profile fields</dt><dd>{completion.completed} of {completion.total}</dd></div><div><dt>Saved specifications</dt><dd>{saved}</dd></div><div><dt>Delivery destinations</dt><dd>{destinations}</dd></div></dl></WorkspaceCard>
 <WorkspaceCard title="Recent Requests" description="Your business's latest saved or submitted sourcing requirements.">{recentRequests.length?<div className="buyer-list">{recentRequests.map(r=><div className="buyer-list-item" key={r.id}><div><strong>{r.reference}</strong><p>{r.lines.map(l=>l.commodityName).join(", ")||"Draft request"}</p></div><StatusPill status={r.status}/><Link href={`/dashboard/requests/${r.id}`}>View</Link></div>)}</div>:<WorkspaceEmpty title="No sourcing requests yet" description="Create a draft or submit a sourcing request for Operations to assess." href="/dashboard/requests/new" action="Start a Buyer Request"/>}</WorkspaceCard></div>
 <section className="buyer-panel"><h2>Quick Actions</h2><div className="buyer-actions-grid"><Link href="/dashboard/requests/new"><strong>Start a Buyer Request</strong><span>Create a draft or submit your requirement.</span></Link><Link href="/dashboard/requests"><strong>My Requests & Quotes</strong><span>Track actual request progress and provide clarifications.</span></Link><Link href="/dashboard/products"><strong>Products & Supply</strong><span>Browse published commodities; no stock is guaranteed.</span></Link><Link href="/dashboard/settings#saved-specifications"><strong>Saved Specifications</strong><span>Templates do not submit a sourcing request or reserve stock.</span></Link></div></section>
 </DashboardFrame>;
}
