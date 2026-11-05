import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {SectionLead,Eyebrow,EditorialCTA} from "@/components/public/editorial";
export const metadata:Metadata={title:"Help & Support | SmartHub AgroChain",description:"Find help with buyer sourcing enquiries, farmer participation, accounts, delivery concerns and platform access. Contact SmartHub through the appropriate channel."};
const subjects=[
 {title:"Buyer sourcing",text:"How to describe your agricultural requirement, confirm specifications and understand quotation or delivery steps.",href:"/for-buyers",link:"Buyer guide"},
 {title:"Farmer participation",text:"What farm information helps, how expected supply differs from available produce and what review means.",href:"/for-farmers",link:"Farmer guide"},
 {title:"Account & login",text:"Questions about verification, secure sign-in or account recovery. Use the official account flows; never share passwords or one-time codes.",href:"/login",link:"Account sign-in"},
 {title:"An existing sourcing case",text:"If you have an authenticated account, the private support area keeps a case-specific conversation and recorded responses.",href:"/support",link:"Open my support cases"},
 {title:"Policies & privacy",text:"Privacy, terms and data handling require legally approved notices before public registration and production processing are enabled.",href:"/privacy",link:"Read privacy status"},
 {title:"Partnership questions",text:"Discuss an operational, logistics, field network or technical collaboration, subject to review.",href:"/partnerships",link:"Partnerships"}
];
export default function Help(){return <PublicShell>
 <section className="editorial-hero"><div className="container editorial-section"><Eyebrow>SmartHub help center</Eyebrow>
  <div style={{maxWidth:850}}><h1 style={{font:"500 clamp(45px,6vw,76px)/1.09 Georgia,serif",letterSpacing:"-.05em",color:"#173e2e",margin:"23px 0"}}>Clear answers. <em style={{color:"#709250"}}>A useful next step.</em></h1>
   <p style={{fontSize:18,lineHeight:1.85,color:"#506a5a",maxWidth:740}}>Find the right information about agricultural sourcing, farmer participation, account access and operational support. Public enquiries and private customer cases are separate channels.</p>
  </div>
  <div className="editorial-actions"><Link href="/faq" className="editorial-button editorial-button-primary">Frequently asked questions <span aria-hidden="true">↗</span></Link>
   <Link href="/contact" className="editorial-button editorial-button-secondary">Contact SmartHub</Link></div></div></section>
 <section className="container editorial-section">
  <SectionLead eyebrow="Choose a topic" title="Where can we help you?" description="These paths lead to actual pages or existing authenticated workflows—not unimplemented chatbots or guaranteed instant replies."/>
  <div className="editorial-step-grid">{subjects.map((s,i)=><article className="editorial-step" key={s.title}>
   <span>0{i+1}</span><h3>{s.title}</h3><p>{s.text}</p><Link className="editorial-inline-link" href={s.href}>{s.link}<span aria-hidden="true">↗</span></Link>
  </article>)}</div>
 </section>
 <section className="editorial-tinted"><div className="container editorial-section editorial-content-grid">
  <div><SectionLead eyebrow="For current users" title="Need help with a specific order, shipment or payout?"/>
   <p style={{lineHeight:1.9,color:"#526c5a"}}>Sign in to your authorized workspace and open a support case. Share the relevant reference and the issue, rather than personal banking secrets or a one-time authentication code.</p>
   <div className="editorial-actions"><Link className="editorial-button editorial-button-primary" href="/support">Open a private support case <span aria-hidden="true">↗</span></Link></div>
  </div>
  <div className="editorial-highlight"><Eyebrow>Safety reminder</Eyebrow>
   <h3>SmartHub will not need your password, OTP or card PIN in a support message.</h3>
   <p>If a transfer, buyer payment or delivery is under review, only the appropriate verified records can resolve it. An informal message is not a replacement for provider reconciliation.</p>
  </div>
 </div></section>
 <EditorialCTA eyebrow="Still have a question?" title="We'll point you toward the right process."
 description="For public information, send an enquiry through the available contact channel. For private cases, sign into your secure support workspace."
 primary={{label:"Contact SmartHub",href:"/contact"}} secondary={{label:"Read the FAQ",href:"/faq"}}/>
 </PublicShell>}
