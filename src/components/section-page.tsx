import { BrandCard, BrandLink } from "./ui/brand";
import { PublicShell } from "./public-shell";

export function SectionPage({eyebrow,title,body,items}: {eyebrow:string;title:string;body:string;items:readonly {title:string;description:string}[]}){
 return <PublicShell>
  <section className="hero-grid border-b border-soft-sage py-20"><div className="container max-w-5xl"><p className="eyebrow">{eyebrow}</p><h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">{title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-forest/80">{body}</p></div></section>
  <section className="container py-16"><div className="grid gap-5 md:grid-cols-2">{items.map(item=><BrandCard key={item.title} className="surface p-7"><h2 className="text-xl font-bold text-forest">{item.title}</h2><p className="mt-3 leading-7 text-[#526858]">{item.description}</p></BrandCard>)}</div><div className="mt-12"><BrandLink variant="secondary" className="action action-outline" href="/contact">Contact SmartHub</BrandLink></div></section>
 </PublicShell>;
}
