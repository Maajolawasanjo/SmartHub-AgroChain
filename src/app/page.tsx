import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

const capabilities = [
  { title: "Structured Supply Information", description: "Organise relevant product, quantity, location and availability information for more informed sourcing." },
  { title: "Managed Sourcing", description: "Buyer requirements are reviewed as SmartHub works to identify potentially suitable agricultural supply." },
  { title: "Verification & Review", description: "Relevant farmer, farm, crop and supply information moves through controlled review processes." },
  { title: "Fulfilment Coordination", description: "Where requirements align, the next steps toward transactions and fulfilment can be coordinated." },
];

export default function Home() {
  return <PublicShell>
    <section className="hero-grid relative overflow-hidden border-b border-[#d8e5da] py-24 md:py-32">
      <div className="container grid items-center gap-12 lg:grid-cols-[1.2fr_.8fr]">
        <div><span className="pill">Building a better agricultural supply chain</span><h1 className="mt-7 max-w-4xl text-5xl font-extrabold leading-[1.07] tracking-tight text-[#123d2b] md:text-6xl">Connecting agricultural supply with <span className="text-[#a87925]">real market demand.</span></h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-[#48604e]">SmartHub AgroChain is a Nigerian agricultural technology platform building a more organised way to connect farmers, buyers and agricultural businesses through sourcing and supply-chain coordination.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/for-buyers" className="action action-primary">Explore buyer sourcing</Link><Link href="/for-farmers" className="action action-outline">For farmers & producers</Link></div>
        <p className="mt-5 text-sm text-[#536b59]">Better information. Better connections. A more organised agricultural supply chain.</p></div>
        <div className="surface relative overflow-hidden p-8 shadow-xl shadow-[#0b2c20]/10" aria-label="Illustration of SmartHub managed sourcing process">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-[#e8b34f]/20"/>
          <p className="eyebrow relative">The SmartHub process</p><h2 className="relative mt-4 text-2xl font-bold text-[#123d2b]">From demand to suitable supply</h2>
          <ol className="relative mt-7 space-y-4">{["Buyer shares a sourcing requirement", "Available supply is reviewed", "SmartHub coordinates matching", "Agreed fulfilment is tracked"].map((x,i)=><li key={x} className="flex items-center gap-4 rounded-xl border border-[#e1e9e0] bg-white p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e6eee6] text-sm font-bold text-[#123d2b]">{i+1}</span><span className="text-sm font-semibold text-[#244333]">{x}</span></li>)}</ol>
          <p className="relative mt-5 text-xs text-[#62746a]">Process illustration, not a live transaction.</p>
        </div>
      </div>
    </section>
    <section className="container py-20"><p className="eyebrow">What we do</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">A more organised approach to agricultural sourcing</h2><div className="mt-9 grid gap-5 md:grid-cols-2">{capabilities.map((c,i)=><article key={c.title} className="surface p-8"><span className="text-sm font-bold text-[#9b782a]">0{i+1}</span><h3 className="mt-3 text-xl font-bold text-[#123d2b]">{c.title}</h3><p className="mt-3 leading-7 text-[#526858]">{c.description}</p></article>)}</div></section>
    <section className="container pb-6"><div className="grid overflow-hidden rounded-2xl border border-[#dce5de] md:grid-cols-2"><div className="bg-white p-10"><p className="eyebrow">Agricultural buyers</p><h2 className="mt-3 text-2xl font-bold">Source with greater visibility</h2><p className="mt-4 leading-7 text-[#526858]">Tell SmartHub what your business needs and follow an organised sourcing process.</p><Link className="mt-6 inline-block font-bold text-[#123d2b] underline" href="/for-buyers">Learn about buying</Link></div><div className="bg-[#e1eee0] p-10"><p className="eyebrow">Farmers & producers</p><h2 className="mt-3 text-2xl font-bold">Connect produce with demand</h2><p className="mt-4 leading-7 text-[#526858]">Organise your farm, crop and supply information as the SmartHub network develops.</p><Link className="mt-6 inline-block font-bold text-[#123d2b] underline" href="/for-farmers">Learn about participation</Link></div></div></section>
  </PublicShell>;
}
