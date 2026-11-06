import { BrandLink } from "@/components/ui/brand";
import Image from "next/image";
import type {ReactNode} from "react";

export type VisualKey="land"|"harvest"|"grower"|"produce"|"fields"|"operations";
const photos:Record<VisualKey,{src:string;alt:string;credit:string}>={
 land:{src:"https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=82",alt:"Wide green agricultural landscape in natural daylight",credit:"Illustrative agricultural photograph"},
 harvest:{src:"https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1400&q=82",alt:"Agricultural crops and harvesting landscape",credit:"Illustrative agricultural photograph"},
 grower:{src:"https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&w=1300&q=80",alt:"Sunlit cultivated field with growing crops",credit:"Illustrative agricultural photograph"},
 produce:{src:"https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1400&q=80",alt:"Fresh agricultural produce arranged for market",credit:"Illustrative agricultural photograph"},
 fields:{src:"https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=1600&q=82",alt:"Cultivated farmland extending across the landscape",credit:"Illustrative agricultural photograph"},
 operations:{src:"https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1400&q=82",alt:"Agricultural working landscape in a rural setting",credit:"Illustrative agricultural photograph"}
};
export function EditorialPhoto({visual,className="",priority=false,caption=false}:{
 visual:VisualKey;className?:string;priority?:boolean;caption?:boolean
}){
 const item=photos[visual];
 return <figure className={"editorial-photo "+className}>
  <Image src={item.src} alt={item.alt} fill
    sizes="(max-width: 640px) 100vw, (max-width: 900px) 90vw, 50vw"
    quality={75} priority={priority} referrerPolicy="no-referrer"/>
  {caption&&<figcaption>{item.credit} · Not a photograph of SmartHub operations</figcaption>}
 </figure>;
}
export function Eyebrow({children}:{children:ReactNode}){return <span className="editorial-eyebrow"><span aria-hidden="true" className="editorial-eyebrow-mark"/> {children}</span>;}
export function SectionLead({eyebrow,title,description,align="left"}:{eyebrow:string;title:string;description?:string;align?:"left"|"center"}){
 return <div className={"editorial-section-lead"+(align==="center"?" is-centered":"")}>
  <Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2>{description&&<p>{description}</p>}
 </div>;
}
export function EditorialHero({eyebrow,title,description,primary,secondary,visual="land",note,theme="light",children}:{
 eyebrow:string;title:ReactNode;description:string;primary:{label:string;href:string};
 secondary?:{label:string;href:string};visual?:VisualKey;note?:string;theme?:"light"|"dark";children?:ReactNode
}){
 return <section className={"editorial-hero editorial-hero-"+theme}><div className="container editorial-hero-grid">
  <div className="editorial-hero-copy"><Eyebrow>{eyebrow}</Eyebrow><h1>{title}</h1><p>{description}</p>
   <div className="editorial-actions"><BrandLink variant="primary" className="editorial-button editorial-button-primary" href={primary.href}>{primary.label}<span aria-hidden="true">↗</span></BrandLink>
    {secondary&&<BrandLink variant="secondary" className="editorial-button editorial-button-secondary" href={secondary.href}>{secondary.label}</BrandLink>}</div>
   {note&&<p className="editorial-fineprint">{note}</p>}
  </div><div className="editorial-hero-visual"><EditorialPhoto visual={visual} priority caption/>
   {children&&<div className="editorial-overlay-card">{children}</div>}
  </div>
 </div></section>;
}
export function EditorialCTA({eyebrow,title,description,primary,secondary}:{
 eyebrow:string;title:string;description:string;primary:{label:string;href:string};secondary?:{label:string;href:string}
}){
 return <section className="container editorial-ending"><div className="editorial-ending-inner">
  <Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2><p>{description}</p><div className="editorial-actions">
   <BrandLink variant="primary" className="editorial-button editorial-button-primary" href={primary.href}>{primary.label}<span aria-hidden="true">↗</span></BrandLink>
   {secondary&&<BrandLink variant="secondary" className="editorial-button editorial-button-secondary" href={secondary.href}>{secondary.label}</BrandLink>}
  </div></div></section>;
}
export const managedSteps=[
 {number:"01",title:"A buyer tells us what is needed",description:"Products, quantity, quality, destination, preferred dates and relevant specifications become a structured sourcing requirement."},
 {number:"02",title:"SmartHub assesses the request",description:"Operations checks the requirement and looks for suitable, reviewed supply. A submitted request is not a confirmed order."},
 {number:"03",title:"Supply and terms are reviewed",description:"Availability and physical quantities are assessed; commercial terms are presented through an official quotation."},
 {number:"04",title:"A buyer considers the quotation",description:"The buyer accepts the actual proposed terms. Payment, where enabled, requires independent provider confirmation."},
 {number:"05",title:"Fulfilment is coordinated",description:"Pickup, transport and arrival evidence support the agreed arrangement. Buyers confirm what they physically receive."},
 {number:"06",title:"Records and obligations are reconciled",description:"Discrepancies require review; farmer obligations and independently verified transfers remain separate from buyer payment."}
] as const;
