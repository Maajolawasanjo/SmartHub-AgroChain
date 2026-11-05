import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {EditorialHero,SectionLead,EditorialPhoto,Eyebrow,EditorialCTA} from "@/components/public/editorial";
export const metadata:Metadata={
 title:"For Buyers | Agricultural Sourcing with SmartHub",
 description:"Source grains, legumes, roots and agricultural products through a structured SmartHub sourcing request, independently reviewed supply and an approved quotation."
};
const stages=[
 {n:"01",title:"Define the requirement",text:"Name the commodity and variety, target quantity, desired quality, delivery location and preferred timing. Include your business constraints so the brief is actionable."},
 {n:"02",title:"Review and source",text:"SmartHub Operations assesses the request and considers supply information from reviewed farmers and other authorized channels. Potential supply is not an automatic match."},
 {n:"03",title:"Receive clear terms",text:"Suitable supply is presented through an official quotation covering the approved commercial terms. You choose whether to accept; a draft or discussion does not create an order."},
 {n:"04",title:"Confirm and coordinate",text:"Where an order progresses, payment requires independent provider verification. Delivery arrangements, evidence and expected quantities are tracked separately."},
 {n:"05",title:"Receive and report",text:"Confirm quantities physically received. A shortage or delivery issue goes into review; it does not disappear because a shipment was marked arrived."}
];
const buyerTypes=["Food processors & manufacturers","Restaurants, hotels & caterers","Retail and wholesale distributors","Institutions and organized procurement teams"];
export default function Buyers(){return <PublicShell>
 <EditorialHero eyebrow="For buyers & procurement teams" title={<>Agricultural sourcing, <em>without the guesswork.</em></>}
 description="From a precise requirement to an agreed delivery, SmartHub helps business buyers navigate agricultural sourcing through review, clear terms and accountable coordination—not a list of strangers to call."
 primary={{label:"Discuss a sourcing requirement",href:"/contact?interest=buyer"}}
 secondary={{label:"Browse published commodities",href:"/products"}}
 note="Sourcing requests, prices, availability and delivery are reviewed case by case. No instant stock guarantee."
 visual="harvest">
 <span className="editorial-overlay-kicker">Your brief matters</span><strong>Product · Quality · Quantity · Destination</strong>
 <p className="editorial-overlay-meta">A detailed request is the starting point, not an automatic order.</p>
 </EditorialHero>
 <section className="container editorial-section editorial-content-grid">
  <div className="editorial-prose"><SectionLead eyebrow="A more considered buying process" title="Start with what your business actually needs."/>
   <p>Agricultural procurement is rarely just about a product name. The variety, moisture or grade, packaging, availability, delivery windows and inspection conditions can change whether an offer is suitable.</p>
   <p>SmartHub's managed model puts your requirement into a structured workflow so an operations team can evaluate it, consider possible supply and coordinate approved next steps.</p>
   <div className="editorial-metric-free">A request is not a promise of availability. A quotation is not a confirmed payment. A delivery arrival is not a buyer's acceptance of every unit.</div>
  </div><EditorialPhoto visual="produce" caption/>
 </section>
 <section className="editorial-tinted"><div className="container editorial-section">
  <SectionLead eyebrow="Step by step" title="From sourcing brief to recorded receipt."
   description="A practical sequence that keeps commercial decisions, stock and physical delivery evidence distinct."/>
  <div className="editorial-step-grid">{stages.map(s=><article className="editorial-step" key={s.n}><span>{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></article>)}</div>
 </div></section>
 <section className="container editorial-section editorial-content-grid is-reversed">
  <EditorialPhoto visual="land" caption/>
  <div className="editorial-prose"><SectionLead eyebrow="Who the platform is designed for" title="Built around business demand, not impulse checkout."/>
   <p>Whether you buy inputs for processing, plan menus, distribute to retailers or manage institutional procurement, effective sourcing begins with accurate needs.</p>
   <ul>{buyerTypes.map(x=><li key={x}>{x}</li>)}</ul>
   <p>Every request is assessed on its own merits. Geographic coverage, commodity suitability and operational capacity must be confirmed before commitments are made.</p>
  </div>
 </section>
 <section className="editorial-dark-section"><div className="container editorial-dark-grid">
  <div className="editorial-dark-copy"><Eyebrow>More visibility at each milestone</Eyebrow>
   <h2>Know what has been <em>requested, reviewed and received.</em></h2>
   <p>SmartHub records sourcing requests, official quotation decisions, independently verified payment, shipment events and buyer-attested receipts. These are distinct milestones—not interchangeable success labels.</p>
   <div className="editorial-tick-list"><span>Requirements stay attached to the sourcing case</span><span>Approved terms are reviewed before payment</span><span>Physical delivery needs evidence and your confirmation</span><span>Reported issues create a review trail</span></div>
   <Link href="/how-it-works" className="editorial-button editorial-button-primary">See the operating process <span aria-hidden="true">↗</span></Link>
  </div><div className="editorial-orbit"><div className="editorial-orbit-row"><span>01</span><div><strong>Buyer request</strong><p>What you want, in a structured record</p></div></div>
   <div className="editorial-orbit-row"><span>02</span><div><strong>Quotation review</strong><p>Commercial terms before commitment</p></div></div>
   <div className="editorial-orbit-row"><span>03</span><div><strong>Fulfilment evidence</strong><p>Actual operations, not assumed success</p></div></div>
   <div className="editorial-orbit-row"><span>04</span><div><strong>Buyer receipt</strong><p>What arrived, confirmed and recorded</p></div></div>
   <p className="editorial-stateless">Illustrative workflow only. These are not live transactions or fabricated customer results.</p>
  </div>
 </div></section>
 <section className="container editorial-section editorial-questions"><div><SectionLead eyebrow="Before you request" title="What buyers should know."/>
  <p>SmartHub does not advertise unverified stock, guaranteed price locks or automatic fulfilment. Every sourcing arrangement depends on the actual approved offer and operating conditions.</p>
  <Link href="/faq" className="editorial-inline-link">Read all buyer questions <span aria-hidden="true">↗</span></Link></div>
  <div className="editorial-faq-preview"><details><summary>Can my business request a product not yet in the catalogue?</summary><p>Yes. A structured sourcing request may include commodities outside the published catalogue, subject to review.</p></details>
   <details><summary>When will I know the price?</summary><p>An official reviewed quotation sets out applicable commercial terms. Published category information is not a binding quote.</p></details>
   <details><summary>Who coordinates delivery?</summary><p>Delivery or collection arrangements are specified for the individual sourcing case. SmartHub's operations workflow records agreed milestones.</p></details>
  </div>
 </section>
 <EditorialCTA eyebrow="For procurement teams" title="Tell us what you need to source."
 description="Start with the product, quantity, location and timing. We'll explain how the SmartHub sourcing process applies to your requirement."
 primary={{label:"Discuss your requirement",href:"/contact?interest=buyer"}} secondary={{label:"Explore commodities",href:"/products"}}/>
 </PublicShell>}
