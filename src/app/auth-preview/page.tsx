export const metadata = { robots: { index: false, follow: false } };
import Link from "next/link";
import { notFound } from "next/navigation";
import states from "@/features/auth/data/states.json";

export default function AuthPreviewIndex(){
 if(process.env.NODE_ENV==="production")notFound();
 const modules=[...new Set(states.map(s=>s.module))];
 return <main className="auth-preview-index"><Link href="/">← SmartHub website</Link><p className="auth-kicker">Development use only</p><h1>Authentication flow review</h1><p>144 registered UI states across 48 canonical paths. This facility does not call Supabase, send email or SMS, or store sensitive account data. Every preview is non-authoritative.</p>
 {modules.map(m=><section key={m}><h2>{m} <span>{states.filter(s=>s.module===m).length} states</span></h2><div className="auth-index-grid">{states.filter(s=>s.module===m).map(s=><Link key={s.id} href={`${s.route.split("?")[0]}?preview=${s.id}`}><small>{s.id} · {s.basis.includes("APPROVED")?"Client spec":"Proposed"}</small><strong>{s.name}</strong><span>{s.route}</span></Link>)}</div></section>)}
 </main>;
}
