import Link from "next/link";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {PublicShell} from "@/components/public-shell";
import {publicArticle,safeCatalogSlug} from "@/lib/public/catalog";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const r=await publicArticle(slug);return r.item?{title:r.item.title,description:r.item.summary}:{title:"Insights | SmartHub AgroChain",robots:{index:false,follow:false}};}
export default async function InsightDetail({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(!safeCatalogSlug(slug))notFound();const r=await publicArticle(slug);if(r.state==="ready"&&!r.item)notFound();return <PublicShell><section className="container public-section public-article"><Link className="public-text-link" href="/insights">← All insights</Link>{r.item?<article><p className="eyebrow">{r.item.category} · {r.item.publishedAt?.toLocaleDateString("en-NG")}</p><h1>{r.item.title}</h1><p className="public-article-deck">{r.item.summary}</p><div className="public-article-body">{r.item.body.split(/\n\s*\n/).map((p,i)=><p key={i}>{p}</p>)}</div></article>:<div className="public-empty"><h1>Insight unavailable</h1><p>The published-content service is not connected.</p></div>}</section></PublicShell>}
