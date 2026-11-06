"use client";
import {useState,type FormEvent} from "react";
import Script from "next/script";
import { BrandButton, BrandField } from "@/components/ui/brand";
type ContactRole="farmer"|"buyer"|"agribusiness"|"logistics"|"partner"|"investor"|"other";
export function ContactForm({enabled,siteKey,interest,product}:{enabled:boolean;siteKey:string;interest:string;product:string}){
 const known=["farmer","buyer","agribusiness","logistics","partner","investor","other"];
 const initial=known.includes(interest)?interest as ContactRole:"other";
 const [role,setRole]=useState<ContactRole>(initial);const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");const [success,setSuccess]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy||!enabled)return;
  const form=e.currentTarget;const values=Object.fromEntries(new FormData(form).entries());
  setBusy(true);setError("");setSuccess(false);
  try{const res=await fetch("/api/public/enquiries",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(values),cache:"no-store"});
   const data=await res.json().catch(()=>({error:"Unexpected server response."}));if(!res.ok||!data.ok)throw new Error(data.error||"Your message could not be saved.");
   setSuccess(true);form.reset();setRole("other");
  }catch(err){setError(err instanceof Error?err.message:"Unable to submit this enquiry. Please contact us by email.");}
  finally{setBusy(false);}
 }
 return <div className="public-contact-area">
  <div><span className="eyebrow">Send a message</span><h2>Tell us how we can help</h2><p>Share your enquiry and the team will review it when contact submissions are activated. If the service is unavailable, please use the email address below.</p>
  <p><a className="public-text-link" href="mailto:info@smarthubagrochain.online">info@smarthubagrochain.online</a></p>
  <p className="public-small-note">The approved privacy notice and abuse protection must be in place before online enquiries are accepted.</p></div>
  <form className="public-contact-form" onSubmit={submit} noValidate={false} aria-label="Contact form">
    <BrandField htmlFor="contact-name" label="Full name *"><input className="sh-input" id="contact-name" name="fullName" required minLength={2} maxLength={160} autoComplete="name"/></BrandField>
    <BrandField htmlFor="contact-email" label="Email address *"><input className="sh-input" id="contact-email" name="email" type="email" required maxLength={254} autoComplete="email"/></BrandField>
    <BrandField htmlFor="contact-phone" label="Phone number"><input className="sh-input" id="contact-phone" name="phone" type="tel" maxLength={24} autoComplete="tel"/></BrandField>
    <BrandField htmlFor="contact-org" label="Organisation / Business"><input className="sh-input" id="contact-org" name="organisation" maxLength={180} autoComplete="organization"/></BrandField>
    <BrandField htmlFor="contact-role" label="I am a *"><select className="sh-select" id="contact-role" name="audience" value={role} onChange={e=>setRole(e.target.value as ContactRole)} required>
      <option value="farmer">Farmer</option><option value="buyer">Buyer</option><option value="agribusiness">Agribusiness</option><option value="logistics">Logistics Provider</option><option value="partner">Potential Partner</option><option value="investor">Investor</option><option value="other">Other</option>
    </select></BrandField>
    <BrandField htmlFor="contact-subject" label="Subject *"><input className="sh-input" id="contact-subject" name="subject" defaultValue={product?`Sourcing enquiry: ${product}`:""} required minLength={3} maxLength={180}/></BrandField>
    <BrandField className="public-form-full" htmlFor="contact-message" label="Message *"><textarea className="sh-textarea" id="contact-message" name="message" required minLength={20} maxLength={4000} rows={6} placeholder="Tell us the product, specifications, region or nature of your enquiry."/></BrandField>
    <input type="hidden" name="productSlug" value={product}/>
    <div className="public-honeypot" aria-hidden="true"><label htmlFor="contact-website">Website<input id="contact-website" name="website" tabIndex={-1} autoComplete="off"/></label></div>
    {enabled&&siteKey&&<div className="public-form-full"><div className="cf-turnstile" data-sitekey={siteKey}/><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /></div>}
    {success&&<p role="status" className="public-form-message success">Your enquiry has been recorded. It has not created an order or reserved stock.</p>}
    {error&&<p role="alert" className="public-form-message error">{error}</p>}
    {!enabled&&<p className="public-form-full public-small-note" role="status">Online submissions are not enabled yet. For now, email your message to <a href="mailto:info@smarthubagrochain.online">info@smarthubagrochain.online</a>.</p>}
    <BrandButton variant="primary" className="action action-primary" type="submit" disabled={!enabled||busy}>{busy?"Sending…":"Send Message"}</BrandButton>
  </form>
 </div>;
}
