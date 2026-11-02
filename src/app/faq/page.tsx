import type {Metadata} from "next";
import Link from "next/link";
import {PublicShell} from "@/components/public-shell";
export const metadata:Metadata={title:"Frequently Asked Questions",description:"Answers about SmartHub AgroChain, managed sourcing, agricultural supply, buyers, farmers and participation."};
const faqs=[
 ["What is SmartHub AgroChain?","SmartHub AgroChain is a Nigerian agricultural technology company building a digital ecosystem that connects agricultural supply with real market demand."],
 ["Is SmartHub an agricultural marketplace?","SmartHub is building a managed sourcing model, not an unrestricted marketplace. It focuses on buyer demand, suitable supply, verification and coordination."],
 ["Who can use SmartHub?","Farmers, agricultural buyers, agribusinesses and legitimate participants across the agricultural value chain."],
 ["How can I buy agricultural products through SmartHub?","You can share a sourcing requirement covering product, quantity, quality and other needs. SmartHub can work toward identifying potentially suitable supply."],
 ["Does SmartHub buy produce directly from farmers?","SmartHub's primary role is sourcing coordination, not representing itself as the buyer of every product. Transaction arrangements can differ."],
 ["Does SmartHub guarantee agricultural supply?","No. Availability changes with seasonality, production conditions and demand. Availability must be confirmed for a specific request."],
 ["Does SmartHub currently export agricultural products?","Export and wider trade are part of a longer-term vision. SmartHub should not be considered an established exporter unless relevant operations are active and verified."],
 ["How does SmartHub verify supply?","Relevant supply information is reviewed through the SmartHub operating process. Specific verification steps depend on the product and sourcing requirements."],
 ["Does SmartHub operate across all Nigeria?","The network is being developed progressively in targeted locations. Local capability and availability must be confirmed."],
 ["How can farmers join?","Farmers can register and provide their farm, crop and supply information for the relevant review processes."],
 ["How can my organisation partner with SmartHub?","Contact the team with your organisation, capabilities and proposed area of collaboration."]
] as const;
export default function FAQ(){return <PublicShell><section className="public-hero"><div className="container public-hero-content"><span className="public-kicker">Help & questions</span><h1>Frequently Asked Questions</h1><p>Learn how SmartHub is developing managed agricultural sourcing, information review and participation.</p></div></section><section className="container public-section public-faq-list">{faqs.map(([q,a])=><details key={q} className="public-faq-item"><summary>{q}<span aria-hidden="true">＋</span></summary><p>{a}</p></details>)}<div className="public-cta-band"><div><h2>Need something clarified?</h2><p>Contact our team about sourcing, farming participation or partnerships.</p></div><Link href="/contact" className="action action-primary">Contact SmartHub</Link></div></section></PublicShell>}
