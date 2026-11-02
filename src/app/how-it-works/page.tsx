import type {Metadata} from "next";
import {MarketingPage} from "@/components/public/marketing";
export const metadata:Metadata={title:"How SmartHub Works",description:"Understand managed agricultural sourcing: requirements, suitable supply, review, matching, coordination and fulfilment."};
export default function How(){return <MarketingPage eyebrow="The SmartHub process" title="From Buyer Demand to Agricultural Supply" description="SmartHub organises the steps between a sourcing requirement and potentially suitable agricultural supply, through operational review and coordination before fulfilment." steps={[
 {title:"Tell Us What You Need",description:"A buyer provides product, quantity, quality, location, timeframe and other relevant sourcing information."},
 {title:"We Identify Suitable Supply",description:"SmartHub reviews the requirement and considers relevant farmer, producer and supplier information."},
 {title:"Supply Information Is Reviewed",description:"Product, quantity, location, quality, source, timing and availability may be assessed through the operating process."},
 {title:"Suitable Supply Is Matched",description:"Potentially suitable supply is proposed for further review; a match does not mean an order is complete."},
 {title:"The Transaction Is Coordinated",description:"Where applicable approvals and terms are met, SmartHub supports the agreed operational transaction process."},
 {title:"Fulfilment Is Tracked",description:"Pickup, delivery, collection or other agreed arrangements are coordinated according to the actual transaction."},
 {title:"Completion Creates a Record",description:"Recorded transaction outcomes help improve accountability and future agricultural decisions."}
 ]} primary={{label:"Get Started",href:"/signup"}} secondary={{label:"Browse Products",href:"/products"}} asideTitle="A managed sourcing model—not an open marketplace" aside="Availability, harvests, quality and logistics can change. SmartHub is designed to verify information and coordinate relevant supply rather than promise that every listed commodity can be bought immediately."/>}
