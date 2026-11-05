import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {EditorialHero,SectionLead,EditorialPhoto,Eyebrow,EditorialCTA,managedSteps} from "@/components/public/editorial";
export const metadata:Metadata={title:"How SmartHub Works | From Sourcing Request to Receipt",description:"Understand the actual managed procurement stages: buyer requirements, supply review, official quotation, provider-verified payment, physical delivery and separate farmer settlement."};
const gates=[
 {title:"Supply isn't assumed",copy:"Farm declarations, expected harvest and confirmed physical lots are recorded differently. Reviewed availability is considered for each buyer requirement."},
 {title:"Commercial terms require agreement",copy:"A proposed match becomes an official quotation only through the relevant workflow. Buyer acceptance and payment verification must not be inferred from a draft."},
 {title:"Delivery is not the same as receipt",copy:"Pickup and arrival events require operational evidence. The buyer confirms the quantities actually accepted; shortages and damage can trigger investigation."},
 {title:"Payment to SmartHub is not payment to a farmer",copy:"The buyer charge, approved supplier purchase terms and externally verified farmer payout are separately governed financial events."}
];
export default function How(){return <PublicShell>
 <EditorialHero eyebrow="How managed sourcing works" title={<>A better supply chain starts with <em>clearer steps.</em></>}
 description="SmartHub organizes the work between business demand and agricultural supply. The process moves through independent checks so a discussion, a quotation, a payment and a completed delivery are never confused."
 primary={{label:"Start with your sourcing need",href:"/contact?interest=buyer"}} secondary={{label:"Explore the platform",href:"/product"}}
 note="This describes the intended operating workflow. Availability, payments, physical movements and supplier obligations depend on real approved records."
 visual="fields">
 <span className="editorial-overlay-kicker">The essential handoffs</span>
 <strong>Request → Review → Quote → Deliver → Reconcile</strong>
 <p className="editorial-overlay-meta">Each milestone has its own accountable decision.</p>
 </EditorialHero>
 <section className="container editorial-section">
  <SectionLead eyebrow="The end-to-end journey" title="Six stages from need to outcome."
   description="The same case should carry its requirements, approved decisions and operational evidence as it progresses."/>
  <div className="editorial-detail-list">{managedSteps.map(s=><article key={s.number}>
   <span>{s.number}</span><div><h3>{s.title}</h3><p>{s.description}</p></div>
  </article>)}</div>
 </section>
 <section className="editorial-tinted"><div className="container editorial-section editorial-content-grid">
  <div className="editorial-prose"><SectionLead eyebrow="The participants" title="Who does what along the way?"/>
   <p><strong>Buyers</strong> define sourcing requirements, approve quoted terms and confirm goods physically received.</p>
   <p><strong>Farmers</strong> submit farm and supply information, take part in verification and consider supplier commercial terms.</p>
   <p><strong>Field Agents</strong> gather assigned evidence; <strong>Operations</strong> manages sourcing and fulfilment; <strong>Super Admin</strong> provides additional governance and independent financial approvals.</p>
   <Link href="/product" className="editorial-inline-link">Explore the five workspaces <span aria-hidden="true">↗</span></Link></div>
  <EditorialPhoto visual="harvest" caption/>
 </div></section>
 <section className="container editorial-section"><SectionLead eyebrow="The controls behind the journey" title="Four distinctions that protect everyone involved."/>
  <div className="editorial-assurance-grid">{gates.map((g,i)=><article className="editorial-assurance" key={g.title}>
   <span>0{i+1}</span><h3>{g.title}</h3><p>{g.copy}</p></article>)}</div>
 </section>
 <section className="editorial-dark-section"><div className="container editorial-dark-grid">
  <div className="editorial-dark-copy"><Eyebrow>When things don't go to plan</Eyebrow>
   <h2>Good systems need a way to <em>handle exceptions.</em></h2>
   <p>Not every buyer requirement will find suitable stock. A payment can require additional verification. A shipment may arrive short or damaged. Those cases need evidence, independent review and a record of the eventual decision.</p>
   <p>SmartHub does not silently transform an unresolved issue into a completed transaction or automatically release money based only on a delivery label.</p>
   <Link href="/help" className="editorial-button editorial-button-primary">Get help and answers <span aria-hidden="true">↗</span></Link></div>
  <div className="editorial-orbit">
   {["A sourcing request is declined or clarified","A buyer payment requires provider review","A shipment has an arrival or quantity issue","A supplier transfer needs independent reconciliation"].map((x,i)=><div className="editorial-orbit-row" key={x}><span>0{i+1}</span><div><strong>{x}</strong><p>An explicit investigation or next step is recorded.</p></div></div>)}
   <p className="editorial-stateless">Examples of workflow conditions, not assertions that these incidents have occurred.</p></div>
 </div></section>
 <section className="container editorial-section editorial-questions"><div>
  <SectionLead eyebrow="Choose your path" title="Every participant enters from a different starting point."/>
  <p>Buyers begin with the need. Farmers begin with what they grow and what they can actually supply. SmartHub coordinates the relationship between them.</p></div>
  <div className="editorial-faq-preview">
   <Link className="editorial-commodity" href="/for-buyers"><span className="editorial-commodity-initial">B</span><span><strong>I'm sourcing agricultural produce</strong><small>What to prepare as a buyer</small></span><span aria-hidden="true">↗</span></Link>
   <Link className="editorial-commodity" href="/for-farmers"><span className="editorial-commodity-initial">F</span><span><strong>I'm a farmer or producer</strong><small>How farm and supply review works</small></span><span aria-hidden="true">↗</span></Link>
   <Link className="editorial-commodity" href="/partnerships"><span className="editorial-commodity-initial">P</span><span><strong>We support agricultural operations</strong><small>Explore responsible collaboration</small></span><span aria-hidden="true">↗</span></Link>
  </div>
 </section>
 <EditorialCTA eyebrow="The next practical step" title="Start with a real requirement or real supply."
 description="We'll help you understand the relevant process without claiming a price, buyer or delivery outcome before it has been assessed."
 primary={{label:"Contact SmartHub",href:"/contact"}} secondary={{label:"Browse products",href:"/products"}}/>
 </PublicShell>}
