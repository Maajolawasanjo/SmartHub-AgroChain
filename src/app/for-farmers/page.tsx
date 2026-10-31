import type {Metadata} from "next";
import {MarketingPage} from "@/components/public/marketing";
export const metadata:Metadata={title:"Join a Farmer Network in Nigeria",description:"Join SmartHub AgroChain's growing farmer network and connect farm and agricultural supply information with real market demand."};
export default function Farmers(){return <MarketingPage eyebrow="Farmers & producers" title="Connect Your Farm With Real Market Demand" description="Farmers produce the food and raw materials that keep agriculture moving. SmartHub AgroChain is building technology to organise agricultural supply information and create stronger connections with market demand." steps={[
 {title:"Register",description:"Create a farmer account and complete required contact verification."},
 {title:"Provide Farm Information",description:"Describe your farm, location, crops and agricultural activities."},
 {title:"Provide Supply Information",description:"Distinguish expected harvests from produce that physically exists and is available."},
 {title:"Verification",description:"Relevant farmer, farm and supply information moves through an appropriate review process."},
 {title:"Market Opportunities",description:"Eligible supply may be considered for suitable buyer demand, subject to review and availability."}
 ]} primary={{label:"Join as a Farmer",href:"/signup?role=farmer"}} secondary={{label:"How It Works",href:"/how-it-works"}} asideTitle="Farmers Are Not the Problem. The System Needs to Work Better." aside="Farmers should not carry the entire burden created by fragmented markets, weak information systems and inefficient coordination. Better systems can improve the way agriculture works."/>}
