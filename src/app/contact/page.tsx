import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {ContactForm} from "@/components/public/contact-form";
import {safeCatalogSlug} from "@/lib/public/catalog";
import {EditorialHero,EditorialPhoto,SectionLead,EditorialCTA} from "@/components/public/editorial";
export const metadata:Metadata={title:"Contact SmartHub AgroChain | Sourcing, Farmers & Partnerships",description:"Talk to SmartHub about agricultural sourcing needs, farmer participation, logistics collaboration and the right next step for your business."};
export default async function Contact({searchParams}:{searchParams:Promise<{interest?:string;product?:string}>}){
 const p=await searchParams,product=safeCatalogSlug(p.product??"")??"";
 const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY??"";
 const enabled=process.env.PUBLIC_CONTACT_ENABLED==="true"&&!!process.env.DATABASE_URL&&!!process.env.TURNSTILE_SECRET_KEY&&!!process.env.CONTACT_HASH_SECRET&&!!siteKey;
 const routes=[
  {title:"Agricultural sourcing",text:"Tell us the commodity, quantity, grade, destination and timing needed by your business.",href:"/contact?interest=buyer#contact-form"},
  {title:"Farm participation",text:"Introduce your farm, crops, location and current or expected supply.",href:"/contact?interest=farmer#contact-form"},
  {title:"Partnerships",text:"Describe your business, service coverage and potential role in agricultural sourcing.",href:"/contact?interest=partner#contact-form"}
 ];
 return <PublicShell>
  <EditorialHero eyebrow="Get in touch with SmartHub" title={<>Let's start with <em>a real conversation.</em></>}
   description="Whether you need agricultural produce, grow it or help move it, the right next step begins with a clear introduction. Tell us what you need and what is relevant to your location."
   primary={{label:"See contact options",href:"#contact-options"}} secondary={{label:"How it works",href:"/how-it-works"}}
   visual="produce" note="Responses, service coverage and participation depend on operational availability; no instant supply or response time is guaranteed.">
   <span className="editorial-overlay-kicker">A useful first message</span>
   <strong>Who you are · What you need · Where · When</strong><p className="editorial-overlay-meta">Avoid sharing passwords, OTPs or bank PINs.</p>
  </EditorialHero>
  <section id="contact-options" className="container editorial-section">
   <SectionLead eyebrow="Choose your enquiry" title="Which conversation should we start?"
    description="Selecting a topic helps direct your enquiry. Active account holders can also use the authenticated support portal for private cases."/>
   <div className="editorial-contact-options">{routes.map(r=><article key={r.title}>
    <h3>{r.title}</h3><p>{r.text}</p><Link className="editorial-inline-link" href={r.href}>Select this enquiry <span aria-hidden="true">↗</span></Link>
   </article>)}</div>
  </section>
  <section id="contact-form" className="editorial-tinted"><div className="container editorial-section">
    <SectionLead eyebrow="Send your details" title="A clear enquiry helps us understand the next step."
      description="Choose your enquiry type, share the relevant details and use the protected form when online submissions are enabled. The official email address is always available as an alternative."/>
    <ContactForm enabled={enabled} siteKey={siteKey} interest={p.interest??"other"} product={product}/>
  </div></section>
  <section className="container editorial-section editorial-content-grid is-reversed">
   <EditorialPhoto visual="land" caption/>
   <div><SectionLead eyebrow="Before you write" title="What happens after an enquiry?"/>
    <p style={{lineHeight:1.85,color:"#596e5d"}}>SmartHub considers the type of requirement, relevant supply, operating area and practical capacity before proposing any next step. A public enquiry is not itself a confirmed procurement order or accepted supplier agreement.</p>
    <Link href="/faq" className="editorial-inline-link">Read frequently asked questions <span aria-hidden="true">↗</span></Link>
   </div>
  </section>
  <EditorialCTA eyebrow="Explore more" title="Understand the model before you commit."
   description="Learn how we approach sourcing, farmer participation and responsible agricultural supply coordination."
   primary={{label:"How SmartHub works",href:"/how-it-works"}} secondary={{label:"Explore the platform",href:"/product"}}/>
 </PublicShell>;
}
