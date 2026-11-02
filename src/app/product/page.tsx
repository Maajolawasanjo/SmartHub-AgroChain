import type {Metadata} from "next";
import {MarketingPage} from "@/components/public/marketing";
export const metadata:Metadata={title:"Platform | Agricultural Sourcing & Market Access",description:"Explore SmartHub AgroChain's technology for agricultural sourcing, market access, supply information and coordination in Nigeria."};
export default function Platform(){return <MarketingPage eyebrow="The SmartHub platform" title="Technology for a More Connected Agricultural Supply Chain" description="SmartHub AgroChain is developing a digital platform designed to make agricultural sourcing, supply information and market connections easier to manage." steps={[
 {title:"Agricultural Sourcing",description:"Businesses can communicate what they need and the information necessary to identify suitable supply."},
 {title:"Farmer Network",description:"Farmers and producers can participate in a structured digital network with organised agricultural information."},
 {title:"Supply Information",description:"Record commodity types, quantities, availability and appropriate characteristics without claiming unverified stock."},
 {title:"Market Access",description:"Connect producers with genuine market demand through managed sourcing."},
 {title:"Request & Transaction Management",description:"Develop an accountable path for sourcing requests, matching, transactions and fulfilment."},
 {title:"Digital Agricultural Records",description:"Build clearer operational records for better decisions and future agricultural intelligence."}
 ]} primary={{label:"Get Started",href:"/signup"}} secondary={{label:"How It Works",href:"/how-it-works"}} asideTitle="Built in Stages" aside="SmartHub AgroChain is an early-stage company developing and validating its platform. Some capabilities are still being developed; access expands when the underlying technology and operating processes are ready."/>}
