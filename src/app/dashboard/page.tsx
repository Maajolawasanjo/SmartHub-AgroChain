import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceCard,WorkspaceEmpty,StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
import {buyerProfileCompletion} from "@/lib/buyer/profile";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerDashboard(){
 const {account,db}=await requireBuyerPage();
 const membership=await buyerMembership(db,account.id);
 const profile=membership?.organization??null;
 const completion=buyerProfileCompletion(profile);
 const [saved,destinations]=profile?await Promise.all([
  db.buyerSavedSpecification.count({where:{organizationId:profile.id}}),
  db.buyerDeliveryDestination.count({where:{organizationId:profile.id}})
 ]):[0,0];
 const metrics=[
  {title:"Active Requests",detail:"Available when sourcing requests launch"},
  {title:"Quotes Awaiting Decision",detail:"Available when official quotations launch"},
  {title:"Orders in Fulfilment",detail:"Available when order management launches"},
  {title:"Payments Due",detail:"Available when verified payment records launch"},
 ];
 return <DashboardFrame role="BUYER" name={account.fullName} title={`Welcome back, ${account.fullName}`} description="Your agricultural procurement overview.">
 <section className="buyer-hero"><div><span className="buyer-kicker">BUYER PORTAL</span><h2>Procurement starts with the right requirements.</h2><p>Complete your business profile, explore published commodities and save the specifications your business needs. Official sourcing requests will become available in the next phase.</p></div><Link href={completion.complete?"/dashboard/products":"/dashboard/settings"} className="action action-primary">{completion.complete?"Explore Products & Supply":"Complete Business Profile"}</Link></section>
 <div className="buyer-metrics">{metrics.map(m=><section className="buyer-metric" key={m.title}><h3>{m.title}</h3><div className="buyer-metric-pending" aria-label="Metric not available">—</div><p>{m.detail}</p></section>)}</div>
 {!completion.complete?<section className="buyer-alert" aria-live="polite"><h2>Needs Your Attention</h2><p>Your business profile has {completion.missing.length} required field{completion.missing.length===1?"":"s"} remaining: {completion.missing.join(", ")}.</p><Link href="/dashboard/settings" className="action action-primary">Continue profile setup</Link></section>:<section className="buyer-alert buyer-alert--ready"><h2>Business profile complete</h2><p>Your required business details are saved. This is not independent business verification. Sourcing request submission will open when Phase 09 is implemented.</p><StatusPill status={profile?.verificationStatus??"NOT_REQUESTED"}/></section>}
 <div className="buyer-panel-grid"><WorkspaceCard title="Your procurement setup" description="Saved information from your own business workspace."><dl className="buyer-facts"><div><dt>Profile fields</dt><dd>{completion.completed} of {completion.total}</dd></div><div><dt>Saved specifications</dt><dd>{saved}</dd></div><div><dt>Delivery destinations</dt><dd>{destinations}</dd></div></dl></WorkspaceCard>
 <WorkspaceCard title="Recent Requests" description="No sourcing requests are stored yet because the request service has not launched."><WorkspaceEmpty title="Request tracking is coming next" description="You can save commodity requirements today; they do not submit a sourcing request or reserve stock." href="/dashboard/products" action="Browse commodities"/></WorkspaceCard></div>
 <section className="buyer-panel"><h2>Quick Actions</h2><div className="buyer-actions-grid"><Link href="/dashboard/products"><strong>Explore Products & Supply</strong><span>Browse published commodities and save requirements.</span></Link><Link href="/dashboard/settings#saved-specifications"><strong>Saved Specifications</strong><span>Review your saved commodity requirements.</span></Link><Link href="/dashboard/settings#delivery-destinations"><strong>Delivery Destinations</strong><span>Manage the places your business receives goods.</span></Link><Link href="/dashboard/requests"><strong>Requests & Quotes</strong><span>See the status of the upcoming procurement module.</span></Link></div></section>
 </DashboardFrame>;
}
