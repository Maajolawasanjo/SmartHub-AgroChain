import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {EditorialHero,SectionLead,EditorialPhoto,Eyebrow,EditorialCTA} from "@/components/public/editorial";
export const metadata:Metadata={
 title:"For Farmers | Structured Market Access with SmartHub",
 description:"Learn how farmers participate in SmartHub AgroChain: farm profile, crop declarations, verification, suitable buyer demand and independently approved commercial terms."
};
const farmerJourney=[
 {n:"01",title:"Tell us about your farm",copy:"Create your farmer profile with accurate contact details, location, farm information and the crops you produce."},
 {n:"02",title:"Describe your crops responsibly",copy:"Record what is being grown and expected harvest separately from produce that already physically exists. The distinction matters for real commitments."},
 {n:"03",title:"Complete relevant review",copy:"Farm and crop information may require documentation, Field Agent visits and Operations review. A registered account is not an approved supply lot."},
 {n:"04",title:"Consider a sourcing opportunity",copy:"When a genuine buyer requirement is suitable, SmartHub may propose participation under specific availability and commercial conditions."},
 {n:"05",title:"Agree terms and confirm outcomes",copy:"Supplier purchase terms require your consideration and independent approvals. A buyer's payment, delivery completion and farmer settlement are separate, recorded steps."}
];
export default function Farmers(){return <PublicShell>
 <EditorialHero eyebrow="For farmers & producers" title={<>Your harvest deserves <em>a clearer route to market.</em></>}
  description="Growing food is hard enough. Finding suitable demand should begin with organized information and a transparent process. SmartHub is developing a way for farmers to present credible supply and participate in relevant sourcing opportunities."
  primary={{label:"Explore participation",href:"/contact?interest=farmer"}}
  secondary={{label:"See how sourcing works",href:"/how-it-works"}}
  note="Joining does not guarantee a buyer, purchase price or immediate payout. Account registration opens only when the operating service is activated."
  visual="grower"><span className="editorial-overlay-kicker">Farm information that matters</span>
   <strong>Crop · Location · Harvest window · Actual quantity</strong>
   <p className="editorial-overlay-meta">Illustrative checklist; not verified supplier data.</p>
 </EditorialHero>
 <section className="container editorial-section editorial-content-grid">
  <div className="editorial-prose"><SectionLead eyebrow="Built around the realities of farming" title="A better path begins with understanding what you grow."/>
   <p>A farm's expected harvest and ready-to-supply produce are not the same thing. Buyers also need confidence in varieties, quantities, quality and the timing of availability.</p>
   <p>SmartHub's process is designed to make those details clearer, so farmers are considered for requirements that actually fit their supply rather than being placed in a directory of unqualified promises.</p>
   <Link className="editorial-inline-link" href="/product">Explore the farmer workspace <span aria-hidden="true">↗</span></Link>
  </div><EditorialPhoto visual="harvest" caption/>
 </section>
 <section className="editorial-tinted"><div className="container editorial-section">
  <SectionLead eyebrow="Your participation journey" title="From your farm profile to a considered opportunity."
   description="Each stage has a purpose. Registration, field verification, approved supply and commercial settlement are deliberately separate."/>
  <div className="editorial-detail-list">{farmerJourney.map(s=><article key={s.n}>
    <span>{s.n}</span><div><h3>{s.title}</h3><p>{s.copy}</p></div>
  </article>)}</div>
 </div></section>
 <section className="container editorial-section editorial-content-grid is-reversed">
  <EditorialPhoto visual="fields" caption/>
  <div className="editorial-prose"><SectionLead eyebrow="What a farmer can prepare" title="Details that help make supply easier to assess."/>
   <ul><li>Your current contact and farm location information</li><li>Commodity type, variety and intended harvest window</li><li>How much is expected versus how much already exists</li><li>Relevant quality, packaging and storage conditions</li><li>Field or ownership evidence when requested</li></ul>
   <p>Only actual, appropriately reviewed information should be relied upon. SmartHub does not publish private farmer contact details for buyers to trade around its process.</p>
  </div>
 </section>
 <section className="container editorial-section editorial-content-grid">
  <div className="editorial-highlight"><Eyebrow>Commercial clarity</Eyebrow><h3>Being included in the network is not the same as being paid for produce.</h3>
   <p>Supplier price terms are considered independently from the buyer's quotation. Purchase obligations depend on the actual accepted supply and approved conditions. Provider-verified payments are recorded separately from approvals.</p>
   <p>Any dispute, shortage or reversal requires appropriate review rather than an automatic promise of settlement.</p></div>
  <div className="editorial-prose"><SectionLead eyebrow="A relationship built on responsibility" title="Your supply. Your decision. Clearer records."/>
   <p>SmartHub is not asking farmers to surrender their business judgment. Where a sourcing opportunity arises, commercial details still need to be agreed and accurately recorded.</p>
   <Link className="editorial-inline-link" href="/faq">Read participation FAQs <span aria-hidden="true">↗</span></Link>
  </div>
 </section>
 <section className="container editorial-section editorial-questions"><div><SectionLead eyebrow="Important to understand" title="What SmartHub does not promise."/>
  <p>There is no guaranteed buyer for every harvest, no fixed return for signing up and no payout based solely on an order being labelled complete.</p>
  </div><div className="editorial-faq-preview">
   <details><summary>Do I have to harvest before joining?</summary><p>No. Expected and actual supply can be recorded distinctly; only physically confirmed supply can satisfy a real committed order.</p></details>
   <details><summary>Who sets the price for my produce?</summary><p>Specific farmer purchase terms require consideration and approval; the buyer's retail quotation should never be assumed to be the farmer purchase price.</p></details>
   <details><summary>Can buyers contact me directly?</summary><p>SmartHub is a managed procurement intermediary. Operational sourcing and buyer interactions are coordinated through SmartHub rather than an open contact directory.</p></details>
  </div></section>
 <EditorialCTA eyebrow="Growing with clarity" title="Tell us about your farm and the crops you produce."
  description="Start a conversation about suitable participation and which information helps SmartHub assess genuine agricultural supply."
  primary={{label:"Contact the farmer team",href:"/contact?interest=farmer"}} secondary={{label:"Understand the process",href:"/how-it-works"}}/>
 </PublicShell>}
