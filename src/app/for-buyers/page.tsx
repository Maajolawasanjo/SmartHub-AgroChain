import type {Metadata} from "next";
import {MarketingPage} from "@/components/public/marketing";
export const metadata:Metadata={title:"Buy Agricultural Products in Nigeria",description:"Source agricultural products in Nigeria through SmartHub AgroChain. Communicate your needs through an organised sourcing process."};
export default function Buyers(){return <MarketingPage eyebrow="Agricultural buyers" title="A Better Way to Source Agricultural Products" description="Finding agricultural supply should not mean calling dozens of contacts without knowing what is actually available. SmartHub is building a more organised process connecting buyer requirements with relevant agricultural supply." steps={[
 {title:"Submit a Requirement",description:"Tell SmartHub what agricultural products you need."},
 {title:"Define Your Specifications",description:"Share the quantity, type, quality, preferred location and timing."},
 {title:"Receive Relevant Supply Information",description:"SmartHub assesses potentially suitable supply through the appropriate review process."},
 {title:"Review a Match",description:"Review information relevant to your requirement when a potential match can be offered."},
 {title:"Coordinate the Next Step",description:"Where terms are agreed, SmartHub works through the approved transaction and fulfilment process."}
 ]} primary={{label:"Start a Buyer Request",href:"/signup?role=buyer"}} secondary={{label:"How It Works",href:"/how-it-works"}} asideTitle="Built for a variety of agricultural buyers" aside="The platform is designed for food processors, retailers, hotels, caterers, agricultural distributors, institutions and other legitimate buyers. Buyer procurement requests will become available through their authenticated workspace as the service is activated."/>}
