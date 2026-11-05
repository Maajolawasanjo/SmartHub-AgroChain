import Link from "next/link";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {Eyebrow} from "@/components/public/editorial";

export const metadata:Metadata={
 title:"Privacy Notice — Approval Pending | SmartHub AgroChain",
 description:"The SmartHub AgroChain privacy notice is pending legal review. Contact the team about data-protection questions.",
 robots:{index:false,follow:false}
};
export default function Privacy(){
 return <PublicShell>
  <section className="editorial-hero"><div className="container editorial-section">
   <Eyebrow>Legal document · Pending approval</Eyebrow>
   <h1 className="public-legal-heading" style={{maxWidth:820}}>A clearer foundation starts with responsible data practices.</h1>
   <p className="public-prose" style={{maxWidth:750}}>The approved SmartHub AgroChain Privacy Notice has not yet been connected to this implementation. This page is a status notice, not a substitute for legally approved privacy information.</p>
  </div></section>
  <section className="container editorial-section editorial-content-grid">
   <div className="editorial-prose"><h2 className="public-legal-heading">What this means for the platform</h2>
    <p>Registration, identity verification, data retention and contact-data processing must not go live until the final notice is reviewed, approved and published.</p>
    <p>Account data, verification evidence and agricultural business records require appropriate purpose limits, authorization and retention measures. These topics must be addressed by the approved notice before live collection is enabled.</p>
    <div className="editorial-actions"><Link className="editorial-button editorial-button-primary" href="/contact">Ask a privacy question <span aria-hidden="true">↗</span></Link>
     <Link className="editorial-button editorial-button-secondary" href="/help">Help center</Link></div>
   </div>
   <div className="editorial-highlight"><Eyebrow>Not a finalized policy</Eyebrow><h3>No consent is assumed by visiting this page.</h3>
    <p>Live features that require a published privacy notice must remain gated until legal review is complete. SmartHub does not claim these terms are approved.</p>
   </div>
  </section>
 </PublicShell>;
}
