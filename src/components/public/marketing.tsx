import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
export type MarketingSection={title:string;description:string};
export function MarketingPage({eyebrow,title,description,steps,asideTitle,aside,primary,secondary}: {
  eyebrow:string;title:string;description:string;steps:readonly MarketingSection[];
  asideTitle?:string;aside?:string;primary?:{label:string;href:string};secondary?:{label:string;href:string};
}){
return <PublicShell>
  <section className="public-hero"><div className="container public-hero-content"><span className="public-kicker">{eyebrow}</span><h1>{title}</h1><p>{description}</p><div className="public-hero-actions">{primary&&<Link className="action action-primary" href={primary.href}>{primary.label}</Link>}{secondary&&<Link className="action action-outline" href={secondary.href}>{secondary.label}</Link>}</div></div></section>
  <section className="container public-section"><div className="public-section-intro"><span className="eyebrow">The SmartHub approach</span><h2>Clear information. Defined next steps.</h2></div><div className="public-card-grid">{steps.map((item,i)=><article key={item.title} className="public-feature-card"><span className="public-feature-no">{String(i+1).padStart(2,"0")}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></section>
  {asideTitle&&<section className="container public-section"><div className="public-cta-band"><div><span className="public-kicker">Building deliberately</span><h2>{asideTitle}</h2><p>{aside}</p></div><Link className="action action-primary" href="/contact">Contact SmartHub</Link></div></section>}
 </PublicShell>;
}
