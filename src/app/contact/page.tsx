import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {ContactForm} from "@/components/public/contact-form";
import {safeCatalogSlug} from "@/lib/public/catalog";
import {Eyebrow} from "@/components/public/editorial";
export const metadata:Metadata={title:"Contact SmartHub AgroChain | Sourcing, Farmers & Partnerships",description:"Talk to SmartHub about agricultural sourcing needs, farmer participation, logistics collaboration and the right next step for your business."};
export default async function Contact({searchParams}:{searchParams:Promise<{interest?:string;product?:string}>}){
 const p=await searchParams,product=safeCatalogSlug(p.product??"")??"";
 const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY??"";
 const enabled=process.env.PUBLIC_CONTACT_ENABLED==="true"&&!!process.env.DATABASE_URL&&!!process.env.TURNSTILE_SECRET_KEY&&!!process.env.CONTACT_HASH_SECRET&&!!siteKey;
 return <PublicShell><div className="editorial-service editorial-service-contact">
  <section className="container contact-editorial">
   <div className="contact-editorial-intro"><div><Eyebrow>Contact SmartHub</Eyebrow><h1>Let's start with <em>a real conversation.</em></h1></div><p>Whether you buy, grow or move agricultural produce, tell us what you need. Choose the relevant enquiry type and share the details of your requirement.</p></div>
   <section id="contact-form" aria-label="Send a message"><ContactForm enabled={enabled} siteKey={siteKey} interest={p.interest??"other"} product={product}/></section>
   <div className="contact-editorial-note"><p>We assess enquiries based on supply, location and operational capacity. An enquiry is not a confirmed order or supplier agreement. Avoid sharing passwords, OTPs or bank PINs.</p><Link href="/faq" className="editorial-inline-link">Frequently asked questions</Link><Link href="/how-it-works" className="editorial-inline-link">How SmartHub works</Link></div>
  </section>
 </div></PublicShell>;
}
