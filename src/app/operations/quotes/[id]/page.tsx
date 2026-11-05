import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {PortalFrame,requirePortal,StateTag} from "@/components/agriculture/portal-frame";
import {QuoteTransitions} from "@/features/commerce/commerce-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function OperationsQuotation({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requirePortal("OPERATIONS");const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const quote=await db.quotation.findUnique({where:{id},include:{
  request:{select:{id:true,reference:true,status:true,organization:{select:{businessName:true}}}},
  revisions:{orderBy:{number:"desc"},include:{lines:{orderBy:{requestLineId:"asc"},include:{match:{include:{supply:{include:{farmer:{select:{fullName:true}}}}}}}},events:{orderBy:{createdAt:"desc"},include:{actor:{select:{fullName:true}}}}}}
 }});
 if(!quote)notFound();
 if(account.role==="OPERATIONS"){
  const assignment=await db.buyerRequestAssignment.findUnique({where:{requestId:quote.requestId},select:{assignedToId:true}});
  if(assignment?.assignedToId!==account.id)notFound();
 }
 const current=quote.revisions.find(r=>r.number===quote.currentRevision);
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/quotes" title="Commercial Quotation" subtitle={quote.request.reference+" · "+(quote.request.organization.businessName??"Buyer")}>
 <div className="agro-toolbar"><Link href={"/operations/matching/"+quote.requestId}>← Return to matching</Link><StateTag status={quote.status}/><span>Revision {quote.currentRevision}</span></div>
 <section className="agro-panel"><h2>Governed quotation</h2><p>Quote status: {quote.status}. Current version: {quote.version}. Buyer sourcing: {quote.request.status}.</p><p>Only an authorized Super Admin can approve prepared terms. Operations may issue approved terms, and the buyer organization owner can record a decision.</p></section>
 {current&&<><section className="agro-panel"><h2>Current terms and items</h2><p>Valid until: {current.validUntil.toLocaleString("en-NG")} · Currency: {current.currency} · Total: ₦{current.totalNgn.toString()}</p><p>{current.terms}</p>
  {current.lines.map(l=><article className="agro-record" key={l.id}><div><strong>{l.description}</strong><p>{l.quantity.toString()} {l.unit} × ₦{l.unitPriceNgn.toString()} = ₦{l.totalNgn.toString()}</p><p>Internal supplier: {l.match.supply.farmer.fullName} · Candidate {l.matchId.slice(0,8)}</p></div></article>)}
 </section><QuoteTransitions id={id} version={quote.version} status={quote.status} role={account.role}/></>}
 <section className="agro-panel"><h2>Revision and approval history</h2>{quote.revisions.map(r=><article key={r.id} className="agro-record"><div><h3>Revision {r.number} · ₦{r.totalNgn.toString()}</h3><p>Valid until {r.validUntil.toLocaleString("en-NG")}; issued {r.issuedAt?.toLocaleString("en-NG")??"Not issued"}</p><p>{r.terms}</p>{r.events.map(e=><p key={e.id}>{e.createdAt.toLocaleString("en-NG")} · {e.kind.replaceAll("_"," ")} · {e.actor.fullName}{e.note?" · "+e.note:""}</p>)}</div></article>)}</section>
 <div className="agro-alert">Quote acceptance is not payment or an order. Supplier contacts and internal matching evidence remain restricted to Operations and Super Admin.</div>
 </PortalFrame>;
}
