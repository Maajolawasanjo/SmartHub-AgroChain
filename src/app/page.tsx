import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {EditorialHero,EditorialPhoto,SectionLead,Eyebrow,EditorialCTA,managedSteps} from "@/components/public/editorial";

export const metadata:Metadata={
 title:"SmartHub AgroChain | Agricultural Technology & Sourcing in Nigeria",
 description:"SmartHub AgroChain connects farmers, agricultural buyers and businesses in Nigeria through technology-enabled sourcing, market access and supply-chain coordination.",
 openGraph:{title:"SmartHub AgroChain — From the field to real demand",description:"Managed agricultural sourcing built around real requirements, verified information and accountable fulfilment.",type:"website"}
};
const audiences=[
 {label:"For agricultural buyers",heading:"Source with a plan, not guesswork.",copy:"Define what you need, receive reviewed sourcing information and follow agreed steps from quotation through delivery.",href:"/for-buyers",link:"Explore buyer sourcing",visual:"harvest" as const},
 {label:"For farmers & producers",heading:"Give your supply a clearer path.",copy:"Build a structured farm profile, distinguish expected harvest from available produce and consider suitable demand when reviewed.",href:"/for-farmers",link:"See the farmer journey",visual:"grower" as const},
 {label:"For collaborators",heading:"Make the value chain work together.",copy:"Field teams, logistics businesses and agribusiness partners can discuss operational collaboration through SmartHub.",href:"/partnerships",link:"Explore partnerships",visual:"produce" as const}
];
const assurances=[
 {number:"01",title:"Real requirements first",copy:"Buyers describe the actual commodity, volume, quality and delivery needs before a supply commitment is considered."},
 {number:"02",title:"Reviewed information",copy:"Farmer identity, reported stock and field evidence are treated as distinct checks—not interchangeable promises."},
 {number:"03",title:"Accountable execution",copy:"Quotations, verified payments, delivery evidence, receipt confirmations and supplier obligations each have their own state."}
];
const commodityGroups=[
 {title:"Grains & cereals",examples:"Maize · Rice · Sorghum · Millet",symbol:"G"},
 {title:"Legumes & oilseeds",examples:"Soybeans · Groundnuts · Beans",symbol:"L"},
 {title:"Roots & tubers",examples:"Cassava · Yam · Sweet potato",symbol:"R"}
];
export default function Home(){
 return <PublicShell>
  <EditorialHero eyebrow="BUILDING A BETTER AGRICULTURAL SUPPLY CHAIN"
   title={<>Connecting Agricultural Supply With <em>Real Market Demand</em></>}
   description="SmartHub AgroChain is a Nigerian agricultural technology platform designed to connect farmers, buyers and agricultural businesses through better sourcing, market access and supply-chain coordination."
   primary={{label:"Start a Buyer Request",href:"/signup?role=buyer"}} secondary={{label:"Join as a Farmer",href:"/signup?role=farmer"}}
   note="Better information. Better connections. A more organised agricultural supply chain."
   visual="land">
   <span className="editorial-overlay-kicker">How it connects</span>
   <div className="editorial-overlay-chain"><span>Buyer requirement</span><span aria-hidden="true">→</span><span>SmartHub review</span><span aria-hidden="true">→</span><span>Suitable supply</span></div>
   <span className="editorial-overlay-meta">Illustrative process · No live order data</span>
  </EditorialHero>
  <section className="editorial-principle"><div className="container editorial-principle-inner">
   <p>THE SMARTER CONNECTION</p><strong>Demand, supply and execution—<span>finally considered together.</span></strong>
   <Link href="/how-it-works">See how our model works <span aria-hidden="true">↗</span></Link>
  </div></section>
  <section className="container editorial-section editorial-problem">
   <div className="editorial-problem-heading"><Eyebrow>Why the connection matters</Eyebrow>
    <h2>Good harvests deserve more than uncertain markets. Real buyers deserve more than guesswork.</h2></div>
   <div className="editorial-problem-body"><p>Farmers may have produce without clear visibility into demand. Buyers may know exactly what they require but struggle to confirm source, specification, quantities or delivery arrangements.</p>
    <p>SmartHub is designed to work in that middle space: organizing reliable information, coordinating review and helping participants move through a defined sourcing process.</p>
    <Link className="editorial-inline-link" href="/about">Why we're building SmartHub <span aria-hidden="true">↗</span></Link>
   </div>
  </section>
  <section className="editorial-tinted"><div className="container editorial-section">
   <SectionLead eyebrow="THE AGRICULTURAL VALUE CHAIN" title="Connecting the People Who Move Agriculture Forward"
    description="SmartHub's relationships are managed through the platform and its operations team, rather than unrestricted direct buyer-to-farmer trading."/>
   <div className="editorial-audience-grid">{audiences.map((a,i)=><article className="editorial-audience-card" key={a.href}>
    <EditorialPhoto visual={a.visual}/>
    <div className="editorial-audience-copy"><span className="editorial-audience-label">0{i+1} / {a.label}</span><h3>{a.heading}</h3><p>{a.copy}</p><Link className="editorial-inline-link" href={a.href}>{a.link} <span aria-hidden="true">↗</span></Link></div>
   </article>)}</div>
   <p className="editorial-image-disclaimer">Photographs are illustrative agricultural imagery, not depictions of SmartHub suppliers or confirmed operations.</p>
  </div></section>
  <section className="container editorial-section editorial-process-home">
   <div className="editorial-process-heading"><SectionLead eyebrow="THE SMART HUB PROCESS" title="A clear process beats a vague promise."
    description="From the first requirement to the receipt record, each milestone has a purpose and an accountable next step."/>
    <Link className="editorial-inline-link" href="/how-it-works">Explore the complete journey <span aria-hidden="true">↗</span></Link>
   </div>
   <div className="editorial-step-grid">{managedSteps.map(step=><article className="editorial-step" key={step.number}>
    <span>{step.number}</span><h3>{step.title}</h3><p>{step.description}</p>
   </article>)}</div>
  </section>
  <section className="editorial-dark-section"><div className="container editorial-dark-grid">
   <div className="editorial-dark-copy"><Eyebrow>The SmartHub operating model</Eyebrow>
    <h2>Not just connecting people. <em>Coordinating what happens next.</em></h2>
    <p>A listing alone cannot confirm a harvest, reserve goods, settle a supplier or prove delivery. SmartHub separates these decisions and keeps records of who reviewed what.</p>
    <div className="editorial-tick-list"><span>Structured buyer demand and quotations</span><span>Farmer and physical-supply review</span><span>Shipment, receipt and issue records</span><span>Supplier agreements and independent payment checks</span></div>
    <Link className="editorial-button editorial-button-primary" href="/product">Inside the platform <span aria-hidden="true">↗</span></Link>
   </div>
   <div className="editorial-stack-photo"><EditorialPhoto visual="fields"/><div className="editorial-stack-note">
    <span>Illustrative workflow</span><strong>Request → Review → Quote → Deliver</strong><p>Actual states depend on authorized records. This is not a screenshot or a live transaction.</p>
   </div></div>
  </div></section>
  <section className="container editorial-section"><SectionLead eyebrow="A practical approach to confidence"
   title="Three principles behind every sourcing decision."
   description="The system is designed to show what is known, what still needs review and who is responsible for the next step."/>
   <div className="editorial-assurance-grid">{assurances.map(x=><article className="editorial-assurance" key={x.number}>
    <span>{x.number}</span><h3>{x.title}</h3><p>{x.copy}</p>
   </article>)}</div>
  </section>
  <section className="editorial-commodities"><div className="container editorial-section editorial-commodities-inner">
   <div><SectionLead eyebrow="Agricultural product discovery" title="Explore the produce categories that matter to your business."
    description="Start with the category, then discuss the exact variety, grade, volume and timing. Published catalog entries are informational, not a guarantee of current stock."/>
    <Link className="editorial-button editorial-button-primary" href="/products">Browse the published catalogue <span aria-hidden="true">↗</span></Link>
   </div><div className="editorial-commodity-list">{commodityGroups.map((g)=><Link href="/products" className="editorial-commodity" key={g.title}>
    <span className="editorial-commodity-initial" aria-hidden="true">{g.symbol}</span><span><strong>{g.title}</strong><small>{g.examples}</small></span><span aria-hidden="true">↗</span>
   </Link>)}</div>
  </div></section>
  <section className="container editorial-section editorial-questions"><div>
   <Eyebrow>Good questions, clear answers</Eyebrow><h2>What makes SmartHub different from a marketplace?</h2><p>SmartHub operates as a sourcing intermediary. Buyers and farmers work through SmartHub's coordinated process instead of an unrestricted direct-trading directory.</p>
   <Link className="editorial-inline-link" href="/faq">Read frequently asked questions <span aria-hidden="true">↗</span></Link></div>
   <div className="editorial-faq-preview"><details><summary>Does a product listing mean it is available?</summary><p>No. Availability, quality, quantity and timing need to be checked for a specific requirement.</p></details>
    <details><summary>When does a request become an order?</summary><p>Only after suitable supply, an approved quotation, acceptance and the required payment conditions have been confirmed.</p></details>
    <details><summary>Will joining guarantee a farmer a buyer?</summary><p>No. Participation allows supply to be considered for relevant demand; commercial terms and availability remain subject to review.</p></details></div>
  </section>
  <EditorialCTA eyebrow="Your next step" title="Ready to talk about what agriculture could move next?"
   description="Tell us about your sourcing requirements, farm participation or potential partnership. Our process begins with understanding what you actually need."
   primary={{label:"Talk to SmartHub",href:"/contact"}} secondary={{label:"Learn how it works",href:"/how-it-works"}}/>
 </PublicShell>;
}
