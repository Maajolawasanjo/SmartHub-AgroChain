import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {EditorialCTA,Eyebrow,SectionLead} from "@/components/public/editorial";
export const metadata:Metadata={title:"Frequently Asked Questions | SmartHub AgroChain",description:"Answers about managed agricultural sourcing, buyers, farmers, quotations, supply verification, delivery, pricing, settlement and SmartHub participation."};
const sections=[
 {title:"About the platform",items:[
  {q:"What is SmartHub AgroChain?",a:"SmartHub AgroChain is a Nigerian agricultural technology platform being developed to organize real buyer demand, reviewed agricultural supply and accountable sourcing coordination."},
  {q:"Is SmartHub an open marketplace?",a:"No. SmartHub uses a managed sourcing model. Buyer and farmer interactions are coordinated through SmartHub rather than an unrestricted directory where participants trade directly with one another."},
  {q:"Who is SmartHub designed for?",a:"Farmers and producers, agricultural buyers, agribusinesses and operational participants such as field networks and logistics providers, subject to appropriate onboarding and service capacity."},
  {q:"Is SmartHub already operating nationwide?",a:"Geographic service availability is not guaranteed. Specific locations and requirements must be assessed before SmartHub commits to a sourcing or delivery arrangement."}
 ]},
 {title:"Buying and sourcing",items:[
  {q:"How do I source a commodity through SmartHub?",a:"Describe the product, variety, quantity, quality, delivery destination and timing. SmartHub can then assess the requirement and suitable reviewed supply. An enquiry is not automatically an accepted order."},
  {q:"Can I request something not shown in the catalogue?",a:"A buyer sourcing request can describe commodities not currently listed. SmartHub evaluates what is feasible, rather than promising every product is always available."},
  {q:"Does a listed commodity have confirmed stock or a fixed price?",a:"Not by itself. Catalogue publication is informational. Stock availability, exact specification, pricing and fulfilment terms must be confirmed for the individual requirement."},
  {q:"When is an order confirmed?",a:"After the relevant approval and quotation-acceptance steps, and independently verified payment where required. A payment screen or callback alone is not proof that funds were received."},
  {q:"Who handles transportation and delivery?",a:"The approved sourcing arrangement determines delivery or collection responsibilities. Operational milestones and evidence are recorded separately from the buyer's final receipt confirmation."},
  {q:"What if goods arrive short or damaged?",a:"Buyers can report discrepancies through the authorized delivery or support process. A dispute requires review; previously recorded receipt and stock movements are not automatically reversed."}
 ]},
 {title:"Farmers and supply",items:[
  {q:"Can a farmer register before harvest?",a:"Expected harvest can be described separately from physically available stock. Actual committed supply must be independently reviewed; a forecast is not a warehouse quantity."},
  {q:"Does joining guarantee a buyer or fixed purchase price?",a:"No. Opportunities depend on suitable real demand, availability, review and agreed commercial terms. Registration alone guarantees neither a buyer nor earnings."},
  {q:"Does SmartHub buy produce from farmers?",a:"SmartHub coordinates procurement as an intermediary and may establish an approved supplier purchase obligation under agreed terms for a specific sourcing case. This is separate from the buyer's quotation and never assumed automatically."},
  {q:"When is a farmer considered paid?",a:"Only when the relevant supplier transfer has been independently verified by the configured payment provider. A completed buyer order or approved payable is not, by itself, a successful farmer payout."},
  {q:"Are farmer contact details publicly shared with buyers?",a:"The managed sourcing model does not publish private farmer contact details as an open buyer-to-farmer directory."}
 ]},
 {title:"Participation and assistance",items:[
  {q:"Is account registration open to everyone right now?",a:"Registration and service activation depend on approved legal terms, identity systems and operational release gates. If registration is unavailable, you can enquire through the public Contact page."},
  {q:"Can my organization partner with SmartHub?",a:"You can describe your organization, capabilities, coverage and proposed service on the Partnerships or Contact pages. Enquiries do not guarantee a partnership."},
  {q:"How do I raise a support issue?",a:"Public questions can use Contact or this Help page. Signed-in authorized account holders can open and follow private support cases in their workspace."}
 ]}
];
export default function FAQ(){return <PublicShell>
 <section className="editorial-hero"><div className="container editorial-section">
  <Eyebrow>Good questions deserve clear answers</Eyebrow><h1 style={{font:"900 clamp(45px,6vw,78px)/1.09 var(--font-satoshi)",letterSpacing:"-.05em",maxWidth:820,color:"var(--brand-forest)",margin:"24px 0"}}>A clearer way to understand <em style={{color:"var(--brand-agricultural)"}}>agricultural sourcing.</em></h1>
  <p style={{maxWidth:740,color:"#587163",fontSize:17,lineHeight:1.85}}>Learn how SmartHub's managed approach works, where the controls sit and what still needs confirmation before anyone commits to a transaction.</p>
  <div className="editorial-actions"><Link href="/how-it-works" className="editorial-button editorial-button-primary">Explore the process <span aria-hidden="true">↗</span></Link>
   <Link href="/help" className="editorial-button editorial-button-secondary">Help center</Link></div>
 </div></section>
 <div className="container editorial-section">
  {sections.map(group=><section className="editorial-faq-group" key={group.title}>
   <SectionLead eyebrow="Frequently asked questions" title={group.title}/>
   <div className="editorial-faq-preview">{group.items.map(item=><details key={item.q}>
    <summary>{item.q}</summary><p>{item.a}</p></details>)}</div>
  </section>)}
 </div>
 <EditorialCTA eyebrow="Need more detail?" title="Ask about your particular sourcing or participation question."
  description="Different products, locations and operating conditions need different answers. Send a specific enquiry or open a private support case if you already have a SmartHub account."
  primary={{label:"Contact the SmartHub team",href:"/contact"}} secondary={{label:"Find help",href:"/help"}}/>
 </PublicShell>}
