import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {Eyebrow} from "@/components/public/editorial";

export const metadata:Metadata={
 title:"Terms of Service — Approval Pending | SmartHub AgroChain",
 description:"The SmartHub AgroChain Terms of Service are pending legal approval and must be published before account registration opens.",
 robots:{index:false,follow:false}
};
export default function Terms(){
 return <PublicShell>
  <section className="editorial-hero"><div className="container editorial-section">
   <Eyebrow>Legal document · Pending approval</Eyebrow>
   <h1 className="public-legal-heading" style={{maxWidth:830}}>Clear commercial terms should come before commitments.</h1>
   <p className="public-prose" style={{maxWidth:760}}>The legally approved Terms of Service have not yet been supplied for this new website. This page explains the current review status; it does not form an enforceable set of operational terms.</p>
  </div></section>
  <section className="container editorial-section editorial-content-grid">
   <div className="editorial-prose"><h2 className="public-legal-heading">Why approval matters</h2>
    <p>SmartHub connects agricultural sourcing decisions with sensitive identity, commercial, fulfillment and supplier payment operations. Legal terms must explain the actual service model, participant responsibilities and relevant commercial boundaries.</p>
    <p>Do not open account registration or treat any frontend consent as legally effective until the final terms are reviewed and published. Sourcing enquiries cannot substitute for an approved commercial quotation or contract.</p>
    <div className="editorial-actions"><Link href="/contact" className="editorial-button editorial-button-primary">Ask about service terms <span aria-hidden="true">↗</span></Link>
     <Link href="/how-it-works" className="editorial-button editorial-button-secondary">How sourcing works</Link></div>
   </div>
   <div className="editorial-highlight"><Eyebrow>Important boundary</Eyebrow>
    <h3>A proposed transaction is not an agreed transaction.</h3>
    <p>Official terms, buyer acceptance, independent provider verification and delivery obligations require their respective approved processes, not implied consent from a marketing page.</p>
   </div>
  </section>
 </PublicShell>;
}
