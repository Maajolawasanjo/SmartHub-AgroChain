import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {EditorialHero,SectionLead,EditorialPhoto,EditorialCTA,Eyebrow} from "@/components/public/editorial";
export const metadata:Metadata={title:"The SmartHub Platform | Coordinated Agricultural Procurement",description:"Explore SmartHub AgroChain's five operational workspaces for buyers, farmers, field agents, operations and governance, built around real supply, sourcing, fulfilment and settlement."};
const views=[
 {n:"01",role:"Buyers",text:"Structure requirements, review quotations, track confirmed orders, inspect shipment evidence and attest the produce physically received."},
 {n:"02",role:"Farmers",text:"Maintain farm information, distinguish planned harvest from physical supply, review sourcing opportunities and inspect independently verified settlement records."},
 {n:"03",role:"Field Agents",text:"Document authorized farm visits, assigned farmers and evidence. Field activity supports review; it does not independently approve supplier payouts."},
 {n:"04",role:"SmartHub Operations",text:"Assess demand, review supply, coordinate sourcing, record shipment milestones and investigate discrepancies within assigned responsibilities."},
 {n:"05",role:"Super Admin",text:"Oversee permissions, governance, exceptions, independent supplier approvals and aggregate reporting without fabricating financial or stock outcomes."}
];
const rules=[
 {title:"Identity is separate from authorization",copy:"Signing in does not confer Operations or Super Admin powers. Roles, assignment, account status and case ownership are checked on the server."},
 {title:"A supply declaration is not reserved stock",copy:"Expected harvest, reviewed physical lots, reserved units and buyer-accepted receipt quantities are distinct records."},
 {title:"A successful checkout screen is not proof of payment",copy:"Financial status requires an independently verified provider transaction with the correct payer, amount and currency."},
 {title:"A shipment marked arrived is not necessarily received",copy:"Buyer confirmation and discrepancies have their own workflow. Farmer transfer approval follows still more controls."}
];
export default function Platform(){return <PublicShell>
 <EditorialHero eyebrow="The SmartHub platform" title={<>One coordinated system. <em>Five clear workspaces.</em></>}
  description="Agricultural procurement becomes easier to understand when every participant has the right information and responsibilities. SmartHub is being developed as a connected workflow—not five isolated dashboards."
  primary={{label:"See the complete journey",href:"/how-it-works"}} secondary={{label:"Discuss participation",href:"/contact"}}
  note="The authenticated platform is undergoing integration and staged release validation. The illustration does not show actual customer data."
  visual="operations"><span className="editorial-overlay-kicker">A managed operating model</span>
   <strong>Farmer → SmartHub → Buyer</strong><p className="editorial-overlay-meta">Different access rights · Shared accountable records</p>
 </EditorialHero>
 <section className="container editorial-section editorial-content-grid">
  <div className="editorial-prose"><SectionLead eyebrow="The product idea" title="Make the handoffs visible, not just the screens."/>
   <p>A buyer's request starts a commercial conversation. A farmer's declaration describes possible supply. A Field Agent can gather evidence. Operations decides which sourcing steps are appropriate. Super Admin provides independent oversight where required.</p>
   <p>The platform links those decisions without treating them as identical permissions or assuming that a record at one stage proves completion at another.</p>
   <Link className="editorial-inline-link" href="/for-buyers">Explore the buyer experience <span aria-hidden="true">↗</span></Link>
  </div><div className="editorial-orbit"><div className="editorial-orbit-row"><span>1</span><div><strong>Demand captured</strong><p>Buyer-provided requirements</p></div></div>
   <div className="editorial-orbit-row"><span>2</span><div><strong>Supply reviewed</strong><p>Farmer and field evidence considered</p></div></div>
   <div className="editorial-orbit-row"><span>3</span><div><strong>Commercial approval</strong><p>Official quotation and verified payment</p></div></div>
   <div className="editorial-orbit-row"><span>4</span><div><strong>Fulfilment and settlement</strong><p>Actual receipts and controlled supplier obligations</p></div></div>
   <p className="editorial-stateless">This is an explanation of the workflow, not a live order dashboard or fabricated transaction.</p>
  </div>
 </section>
 <section className="editorial-tinted"><div className="container editorial-section">
  <SectionLead eyebrow="Five connected workspaces" title="The right work in the right hands."
   description="Each workspace is designed for a different actor, with access checked using trusted accounts and actual assigned records."/>
  <div className="editorial-step-grid">{views.map(v=><article className="editorial-step" key={v.n}><span>{v.n}</span><h3>{v.role}</h3><p>{v.text}</p></article>)}</div>
 </div></section>
 <section className="container editorial-section editorial-content-grid is-reversed">
  <EditorialPhoto visual="harvest" caption/>
  <div className="editorial-prose"><SectionLead eyebrow="A responsible operating model" title="Built to keep the important distinctions intact."/>
   <p>Real agricultural trade includes uncertainties: available quantities change, quality matters, transport can be delayed and disputes sometimes require human review.</p>
   <p>That is why SmartHub tracks sourcing, payment, physical custody and supplier obligation separately. The platform should expose uncertainty rather than quietly turn it into a green success badge.</p>
  </div>
 </section>
 <section className="editorial-dark-section"><div className="container editorial-section">
  <SectionLead eyebrow="Design principles" title="Records that support decisions—not imaginary certainty."/>
  <div className="editorial-assurance-grid">{rules.map((r,i)=><article className="editorial-assurance" key={r.title}>
   <span>0{i+1}</span><h3 style={{color:"white"}}>{r.title}</h3><p style={{color:"#d4e5d7"}}>{r.copy}</p>
  </article>)}</div>
 </div></section>
 <section className="container editorial-section editorial-questions"><div>
  <SectionLead eyebrow="Current release status" title="Designed, built and being validated in stages."/>
  <p>The platform's code has been implemented through an integrated release phase, but real Supabase staging, provider tests, permission testing, policies and customer acceptance still determine which operations may go live.</p>
  <Link className="editorial-inline-link" href="/contact">Ask about access and availability <span aria-hidden="true">↗</span></Link>
 </div><div className="editorial-highlight"><Eyebrow>Important distinction</Eyebrow><h3>A public description is not proof that all services are active.</h3>
  <p>Signup, payments, payouts, external messaging and other integrations require production configuration and approved launch gates. We will not represent unavailable features as ready for live financial use.</p>
 </div></section>
 <EditorialCTA eyebrow="Get to know SmartHub" title="See where your place in the agricultural chain fits."
  description="Whether you source goods, grow crops or support the logistics behind them, explore how participation is designed to work."
  primary={{label:"How the process works",href:"/how-it-works"}} secondary={{label:"Contact our team",href:"/contact"}}/>
 </PublicShell>}
