import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {EditorialHero,SectionLead,EditorialPhoto,EditorialCTA,Eyebrow} from "@/components/public/editorial";
export const metadata:Metadata={title:"Partnerships | Collaborate with SmartHub AgroChain",description:"Explore responsible collaboration with SmartHub AgroChain across field verification, logistics, agricultural quality, technology and Nigerian agribusiness."};
const opportunities=[
 {n:"01",title:"Field networks and agricultural expertise",copy:"Discuss suitable farm documentation, field-visit practices, locally informed crop information and responsible evidence collection."},
 {n:"02",title:"Logistics and fulfilment services",copy:"Explore practical pickup, transport, handling and receipt workflows, with independently recorded evidence and agreed responsibilities."},
 {n:"03",title:"Quality and commodity specialists",copy:"Help establish clear, understandable criteria for commodity variation, grade, storage and inspection without unverified quality guarantees."},
 {n:"04",title:"Technology and ecosystem collaborators",copy:"Discuss integrations, digital recordkeeping, operational research and service improvements that support actual sourcing processes."}
];
export default function Partnerships(){return <PublicShell>
 <EditorialHero eyebrow="Partnerships & ecosystem collaboration" title={<>Better agricultural systems are <em>built together.</em></>}
 description="The movement of agricultural supply depends on much more than a website. SmartHub welcomes considered conversations with organizations working across field services, quality, logistics, technology and procurement."
 primary={{label:"Discuss a partnership",href:"/contact?interest=partner"}} secondary={{label:"Learn about SmartHub",href:"/about"}} visual="operations"
 note="Partner discussions are exploratory. This page does not imply an existing contract, endorsement or confirmed geographic service coverage.">
 <span className="editorial-overlay-kicker">Working across the value chain</span><strong>Field understanding · Logistics · Information · Trust</strong>
 <p className="editorial-overlay-meta">Opportunities are reviewed against real capacity and operating needs.</p>
 </EditorialHero>
 <section className="container editorial-section editorial-content-grid"><div className="editorial-prose">
  <SectionLead eyebrow="Why collaboration matters" title="No one organization can make every handoff work alone."/>
  <p>Farmers understand their crops. Field networks understand agricultural realities. Buyers understand demand. Logistics providers understand movement. Effective sourcing depends on how that knowledge meets verified information and clearly assigned responsibilities.</p>
  <p>SmartHub's managed procurement model is designed to keep commercial relationships and operational oversight coordinated through SmartHub rather than simply exposing farmer and buyer contacts to each other.</p>
  <Link className="editorial-inline-link" href="/how-it-works">See how the process operates <span aria-hidden="true">↗</span></Link>
 </div><EditorialPhoto visual="fields" caption/></section>
 <section className="editorial-tinted"><div className="container editorial-section">
  <SectionLead eyebrow="Areas for discussion" title="Where responsible partnerships might contribute."
   description="Each conversation starts with capabilities, operating boundaries, availability and the value it can add to real transactions."/>
  <div className="editorial-step-grid">{opportunities.map(o=><article className="editorial-step" key={o.n}><span>{o.n}</span><h3>{o.title}</h3><p>{o.copy}</p></article>)}</div>
 </div></section>
 <section className="container editorial-section editorial-content-grid is-reversed">
  <EditorialPhoto visual="produce" caption/>
  <div className="editorial-prose"><SectionLead eyebrow="How to approach us" title="A productive introduction is specific."/>
   <p>Tell us who you are, where you operate, the service you provide, any relevant operational credentials and the type of collaboration you propose.</p>
   <p>We review proposals in context. No public page can guarantee that a partner application, geographic rollout or vendor integration will be approved.</p>
   <div className="editorial-metric-free">We do not publish fabricated partner logos, testimonials, customer counts or impact statistics.</div>
  </div>
 </section>
 <section className="editorial-dark-section"><div className="container editorial-section editorial-content-grid">
  <div className="editorial-dark-copy"><Eyebrow>Working principles</Eyebrow><h2>Commitments should be <em>clear before they become operational.</em></h2>
   <div className="editorial-tick-list"><span>Defined scope and geographic coverage</span><span>Agreed quality and evidence responsibilities</span><span>Data confidentiality and appropriate consent</span><span>Documented commercial and financial responsibilities</span></div></div>
  <div className="editorial-quote"><blockquote>“A strong supply chain is built through trusted handoffs, not unverified assumptions.”</blockquote>
   <p>SmartHub's operating principle · Not a client testimonial</p></div>
 </div></section>
 <EditorialCTA eyebrow="Start a conversation" title="Have a practical way to strengthen agricultural sourcing?"
  description="Tell us about your organization, your operating region and the collaboration you have in mind."
  primary={{label:"Contact the partnerships team",href:"/contact?interest=partner"}} secondary={{label:"Read our approach",href:"/about"}}/>
 </PublicShell>}
