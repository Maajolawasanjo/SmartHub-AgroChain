import type {Metadata} from "next";
import {MarketingPage} from "@/components/public/marketing";
export const metadata:Metadata={title:"About SmartHub AgroChain | Nigerian AgriTech Company",description:"Learn about SmartHub AgroChain, a Nigerian agricultural technology company focused on sourcing, market access and supply-chain coordination."};
export default function About(){return <MarketingPage eyebrow="About SmartHub AgroChain" title="Building the Infrastructure for a More Connected Agricultural Economy" description="SmartHub AgroChain is a Nigerian agricultural technology company focused on improving the way agricultural supply, market demand and information connect." steps={[
 {title:"Our Story",description:"Fragmented markets and disconnected supply information create friction for farmers and buyers. Better technology and coordination can help improve those relationships."},
 {title:"Our Mission",description:"To improve agricultural market access, transparency and supply-chain coordination through technology."},
 {title:"Our Vision",description:"To become Africa's most trusted digital agricultural ecosystem."},
 {title:"Our Belief",description:"Farmers Are Not the Problem. The System Needs to Work Better. Agriculture needs more reliable information and stronger coordination."}
 ]} primary={{label:"Contact Us",href:"/contact"}} asideTitle="We Are Building Deliberately" aside="SmartHub AgroChain is an early-stage company developing its technology, conducting field research and validating operating processes. We would rather build something that works in the real world than make promises we cannot support."/>}
