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
 const now=new Date();
 const [saved,destinations,activeRequests,recentRequests,officialQuotes,fulfillingOrders,openObligations,requestsForClarification]=member?await Promise.all([
  db.buyerSavedSpecification.count({where:{organizationId:member.organizationId}}),
  db.buyerDeliveryDestination.count({where:{organizationId:member.organizationId}}),
  db.buyerRequest.count({where:{organizationId:member.organizationId,status:{in:["SUBMITTED","UNDER_REVIEW","MORE_INFO_REQUIRED","SOURCING_IN_PROGRESS"]}}}),
  db.buyerRequest.findMany({where:{organizationId:member.organizationId},orderBy:{updatedAt:"desc"},take:4,include:{lines:{orderBy:{position:"asc"},take:2}}}),
  db.quotation.findMany({where:{status:"ISSUED",request:{organizationId:member.organizationId}},select:{
   currentRevision:true,revisions:{orderBy:{number:"desc"},take:1,select:{number:true,issuedAt:true,validUntil:true}}
  }}),
  db.order.count({where:{organizationId:member.organizationId,status:"FULFILLING"}}),
  db.paymentObligation.count({where:{organizationId:member.organizationId,status:"UNPAID"}}),
  db.buyerRequest.count({where:{organizationId:member.organizationId,status:"MORE_INFO_REQUIRED"}})
 ]):[0,0,0,[],[],0,0,0];
 // Only the current, actually issued and unexpired revision can await a buyer decision.
 const issuedQuotes=officialQuotes.filter(q=>{
  const current=q.revisions[0];
  return current?.number===q.currentRevision&&!!current.issuedAt&&current.validUntil>now;
 }).length;
 const metrics=[
  {title:"Active Requests",value:String(activeRequests),detail:"Sourcing requests in progress"},
  {title:"Quotes Awaiting Decision",value:String(issuedQuotes),detail:"Review and respond to valid quotes"},
  {title:"Orders in Fulfilment",value:String(fulfillingOrders),detail:"Confirmed orders being coordinated"},
  {title:"Payments Due",value:String(openObligations),detail:"Outstanding recorded payment obligations · count"}
 ];
 const attention:{label:string;description:string;href:string}[]=[];
 if(!completion.complete)attention.push({label:"Complete your business profile",description:`${completion.missing.length} required field${completion.missing.length===1?"":"s"} remaining before submitting a request.`,href:"/dashboard/settings"});
 if(requestsForClarification>0)attention.push({label:"Requests needing information",description:`${requestsForClarification} request${requestsForClarification===1?"":"s"} returned for additional details.`,href:"/dashboard/requests"});
 if(issuedQuotes>0)attention.push({label:"Quotations awaiting your decision",description:`${issuedQuotes} currently valid quotation${issuedQuotes===1?"":"s"} requiring a decision.`,href:"/dashboard/quotes"});
 if(openObligations>0)attention.push({label:"Payment obligations due",description:`${openObligations} recorded unpaid obligation${openObligations===1?"":"s"} requiring review.`,href:"/dashboard/payments"});
 return <DashboardFrame role="BUYER" name={account.fullName} title="Dashboard" description="Your agricultural procurement overview">
 <section className="buyer-hero"><div><span className="buyer-kicker">BUYER PORTAL</span><h2>Welcome back, {account.fullName}</h2><p>Manage your sourcing requests, quotations, orders and payments in one place.</p><p>Tell us what agricultural supply your business needs. Requests are reviewed by SmartHub before any purchase.</p></div><Link href={completion.complete?"/dashboard/requests/new":"/dashboard/settings"} className="action action-primary">{completion.complete?"Start a Buyer Request":"Complete Business Profile"}</Link></section>
 <div className="buyer-metrics">{metrics.map(m=><section className="buyer-metric" key={m.title}><h3>{m.title}</h3><div className={m.value===null?"buyer-metric-pending":"buyer-metric-value"} aria-label={m.value===null?"Metric not available":undefined}>{m.value??"—"}</div><p>{m.detail}</p></section>)}</div>
 {attention.length>0&&<section className="buyer-alert"><h2>Needs Your Attention</h2><p>Review the items that need your action to keep your procurement moving.</p><div className="buyer-list">{attention.map(item=><div className="buyer-list-item" key={item.href}><div><strong>{item.label}</strong><p>{item.description}</p></div><Link className="action action-outline" href={item.href}>Review</Link></div>)}</div></section>}
 <div className="buyer-panel-grid"><WorkspaceCard title="Your procurement setup" description="Live information from your own organization."><dl className="buyer-facts"><div><dt>Profile fields</dt><dd>{completion.completed} of {completion.total}</dd></div><div><dt>Saved specifications</dt><dd>{saved}</dd></div><div><dt>Delivery destinations</dt><dd>{destinations}</dd></div></dl></WorkspaceCard>
 <WorkspaceCard title="Recent Requests" description="Your business's latest saved or submitted sourcing requirements.">{recentRequests.length?<div className="buyer-list">{recentRequests.map(r=><div className="buyer-list-item" key={r.id}><div><strong>{r.reference}</strong><p>{r.lines.map(l=>l.commodityName).join(", ")||"Draft request"}</p></div><StatusPill status={r.status}/><Link href={`/dashboard/requests/${r.id}`}>View</Link></div>)}</div>:<WorkspaceEmpty title="No sourcing requests yet" description="Create a draft or submit a sourcing request for Operations to assess." href="/dashboard/requests/new" action="Start a Buyer Request"/>}</WorkspaceCard></div>
 <section className="buyer-panel"><h2>Quick Actions</h2><div className="buyer-actions-grid"><Link href="/dashboard/products"><strong>Explore Products &amp; Supply</strong><span>Browse agricultural commodities.</span></Link><Link href="/dashboard/requests"><strong>My Requests &amp; Quotes</strong><span>Track requests and review quotations.</span></Link><Link href="/dashboard/orders"><strong>Orders &amp; Fulfilment</strong><span>Follow confirmed orders.</span></Link><Link href="/dashboard/payments"><strong>Payments &amp; Transactions</strong><span>Review amounts due and payment history.</span></Link></div></section>
 </DashboardFrame>;
}
