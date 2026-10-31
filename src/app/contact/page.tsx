import type {Metadata} from "next";
import Link from "next/link";
import {PublicShell} from "@/components/public-shell";
import {ContactForm} from "@/components/public/contact-form";
import {safeCatalogSlug} from "@/lib/public/catalog";
export const metadata:Metadata={title:"Contact SmartHub AgroChain | Agricultural Technology Nigeria",description:"Contact SmartHub AgroChain about agricultural sourcing, farmer registration, partnerships and business enquiries in Nigeria."};
export default async function Contact({searchParams}:{searchParams:Promise<{interest?:string;product?:string}>}){const p=await searchParams;const product=safeCatalogSlug(p.product??"")??"";
 const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY??"";
 const enabled=process.env.PUBLIC_CONTACT_ENABLED==="true"&&!!process.env.DATABASE_URL&&!!process.env.TURNSTILE_SECRET_KEY&&!!process.env.CONTACT_HASH_SECRET&&!!siteKey;
 return <PublicShell><section className="public-hero"><div className="container public-hero-content"><span className="public-kicker">Contact SmartHub</span><h1>Let's Build a Better Agricultural System Together</h1><p>Whether you are a farmer, buyer, agribusiness, logistics provider, technology company or potential partner, we would like to hear from you.</p></div></section>
 <section className="container public-section"><div className="public-card-grid">{[
 {title:"Agricultural Buyers",text:"Looking for products or discussing sourcing requirements?",href:"/contact?interest=buyer",label:"Talk to our team"},
 {title:"Farmers",text:"Interested in joining the SmartHub farmer network?",href:"/signup?role=farmer",label:"Join as a Farmer"},
 {title:"Partnerships",text:"Interested in a strategic partnership?",href:"/contact?interest=partner",label:"Partner with Us"},
 {title:"General Enquiries",text:"Have a question about SmartHub?",href:"mailto:info@smarthubagrochain.online",label:"Email our team"}
 ].map(c=><article className="public-feature-card" key={c.title}><h2>{c.title}</h2><p>{c.text}</p><Link className="public-text-link" href={c.href}>{c.label}</Link></article>)}</div></section>
 <section className="container public-section"><ContactForm enabled={enabled} siteKey={siteKey} interest={p.interest??"other"} product={product}/></section>
 </PublicShell>;
}
