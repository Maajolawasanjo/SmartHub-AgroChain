import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {EditorialHero,SectionLead,EditorialPhoto,Eyebrow,EditorialCTA} from "@/components/public/editorial";
export const metadata:Metadata={title:"About SmartHub AgroChain | Building Better Agricultural Connections",description:"Learn why SmartHub is building a managed agricultural sourcing platform for farmers, buyers and coordinated supply chains in Nigeria."};
const values=[
 {number:"01",title:"Clarity before commitment",copy:"We believe participants should understand what has been proposed, reviewed and agreed—before they are asked to act."},
 {number:"02",title:"Respect for the producer",copy:"Farmers should be seen as business participants with specific crops, supply realities and commercial choices, not anonymous rows on a listing."},
 {number:"03",title:"Accountability through records",copy:"Reviews, quotation decisions, physical receipt and supplier payments each deserve their own trustworthy record."},
 {number:"04",title:"Technology with real-world grounding",copy:"Software can organize a process. Field evidence, logistics coordination and responsible people are still essential to delivery."}
];
export default function About(){return <PublicShell>
 <EditorialHero eyebrow="The story behind SmartHub" title={<>Agriculture needs more than connections. <em>It needs coordination.</em></>}
  description="SmartHub AgroChain is building a Nigerian agricultural technology platform around a simple idea: farmers and buyers make better decisions when supply information, market requirements and operational follow-through are organized."
  primary={{label:"Explore our platform",href:"/product"}} secondary={{label:"Work with us",href:"/partnerships"}}
  note="We are building and validating the platform in stages. We do not claim unverified network size, impact figures or customer outcomes."
  visual="fields">
  <span className="editorial-overlay-kicker">What we are building</span><strong>Better decisions between field and market.</strong>
  <p className="editorial-overlay-meta">A long-term mission, built through practical steps.</p>
 </EditorialHero>
 <section className="container editorial-section editorial-content-grid">
  <div className="editorial-prose"><SectionLead eyebrow="Our perspective" title="The problem isn't simply a lack of supply or demand."/>
   <p>Farmers can grow produce without knowing where a suitable buyer will emerge. Businesses can have strong demand but insufficient information to assess source, quality, quantity or delivery feasibility.</p>
   <p>Those gaps are not solved by posting more products on a screen. They call for a process that can translate real requirements into reviewed supply, workable commercial terms and documented fulfilment.</p>
   <p>SmartHub is being built to support that process, acting as the managed intermediary between producers and business buyers.</p>
  </div><EditorialPhoto visual="produce" caption/>
 </section>
 <section className="editorial-tinted"><div className="container editorial-section editorial-content-grid">
  <div className="editorial-highlight"><Eyebrow>Our mission</Eyebrow>
   <h3>Make agricultural sourcing more transparent, organized and accountable.</h3>
   <p>Use technology and operational coordination to reduce uncertainty between what buyers need and what producers can genuinely supply.</p></div>
  <div className="editorial-highlight"><Eyebrow>Our direction</Eyebrow>
   <h3>Build a trusted digital foundation for the agricultural value chain.</h3>
   <p>Develop systems that help participants exchange accurate information and make informed commercial decisions—without confusing ambition with verified achievement.</p>
  </div>
 </div></section>
 <section className="container editorial-section"><SectionLead eyebrow="What shapes our decisions" title="Four principles we want to hold ourselves to."
  description="Credibility depends on how the platform operates when a record is uncertain, a delivery is disputed or a payment needs independent review."/>
  <div className="editorial-assurance-grid">{values.map(v=><article className="editorial-assurance" key={v.number}>
   <span>{v.number}</span><h3>{v.title}</h3><p>{v.copy}</p></article>)}</div>
 </section>
 <section className="editorial-dark-section"><div className="container editorial-dark-grid">
  <div className="editorial-dark-copy"><Eyebrow>Why the middle matters</Eyebrow><h2>Farmers grow. Buyers need. <em>Someone must coordinate the handoff.</em></h2>
   <p>We are intentionally not building an unrestricted marketplace where parties are simply sent each other's details. SmartHub manages the sourcing path, records the relevant decisions and helps coordinate approved fulfilment.</p>
   <div className="editorial-tick-list"><span>Farmer-supply understanding and review</span><span>Buyer demand defined in usable detail</span><span>Independent commercial and payment controls</span><span>Delivery and receipt accountability</span></div>
   <Link className="editorial-button editorial-button-primary" href="/how-it-works">Follow the process <span aria-hidden="true">↗</span></Link></div>
  <EditorialPhoto visual="land" caption/>
 </div></section>
 <section className="container editorial-section editorial-content-grid is-reversed">
  <EditorialPhoto visual="grower" caption/>
  <div className="editorial-prose"><SectionLead eyebrow="Where we stand today" title="Building deliberately is part of the promise."/>
   <p>Our technology is being developed through staged implementation and integration testing. Real supplier participation, financial providers, storage, legal documentation and location-based service capacity require operational confirmation before public launch.</p>
   <p>We would rather communicate those limits clearly than invent traction, guarantees, partnerships or field results that cannot yet be supported.</p>
   <Link className="editorial-inline-link" href="/partnerships">Discuss collaboration <span aria-hidden="true">↗</span></Link></div>
 </section>
 <EditorialCTA eyebrow="Let's build responsibly" title="Better agriculture takes more than one participant."
  description="We welcome conversations with growers, procuring businesses, field networks and responsible partners working to improve how agricultural supply moves."
  primary={{label:"Talk with SmartHub",href:"/contact"}} secondary={{label:"Explore partnerships",href:"/partnerships"}}/>
 </PublicShell>}
