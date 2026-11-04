import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {PortalFrame,requirePortal,StateTag} from "@/components/agriculture/portal-frame";
import {MatchBuilder,ActionButton,QuoteBuilder} from "@/features/commerce/commerce-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function MatchingCase({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requirePortal("OPERATIONS");const {id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 const request=await db.buyerRequest.findFirst({where:{id,status:"SOURCING_IN_PROGRESS",submittedAt:{not:null}},include:{
  organization:{select:{businessName:true}},assignment:true,lines:{orderBy:{position:"asc"},include:{matchProposals:{orderBy:{createdAt:"desc"},include:{supply:{include:{farmer:{select:{fullName:true}}}},interests:true}}}},quotation:true}});
 if(!request)notFound();
 const assigned=account.role==="OPERATIONS"&&request.assignment?.assignedToId===account.id;
 const ids=request.lines.map(l=>l.commodityId).filter((v):v is string=>Boolean(v));
 const available=await db.supplyDeclaration.findMany({where:{status:"APPROVED",commodityId:{in:ids},farmer:{status:"ACTIVE"}},
  orderBy:{updatedAt:"desc"},take:150,include:{farmer:{select:{fullName:true}},qualityAssessments:{orderBy:{createdAt:"desc"},take:1}}});
 const eligible=new Map<string,{id:string;label:string;maximum:string}[]>();
 for(const line of request.lines){
  const options=available.filter(s=>s.commodityId===line.commodityId&&s.unit===line.unit&&s.qualityAssessments.length>0&&s.qualityAssessments[0].observedUnit===s.unit&&(!line.specificationId||s.qualityAssessments[0].specificationId===line.specificationId)).map(s=>({
   id:s.id,label:s.farmer.fullName+" · supply "+s.id.slice(0,8)+" · "+s.quantity.toString()+" "+s.unit,
   maximum:s.qualityAssessments[0].observedQuantity.toString()+" "+s.unit
  }));
  eligible.set(line.id,options);
 }
 const rows=request.lines.map(l=>({requestLineId:l.id,title:l.commodityName+" · requested "+l.quantity.toString()+" "+l.unit,
  matches:l.matchProposals.filter(m=>m.status==="INTERESTED").map(m=>({id:m.id,label:m.supply.farmer.fullName+" · "+m.quantity.toString()+" "+m.unit}))}));
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/matching" title="Match Approved Supply" subtitle={request.reference+" · "+(request.organization.businessName??"Buyer")}>
 <div className="agro-toolbar"><Link href="/operations/matching">← All sourcing cases</Link><Link href={"/operations/requests/"+id}>View demand review</Link><StateTag status={request.status}/></div>
 <section className="agro-panel"><h2>Assigned ownership</h2><p>{assigned?"You are the assigned Operations reviewer.":"You can inspect sourcing only. The assigned Operations reviewer must create matches and quotes."}</p></section>
 {request.lines.map(l=><section key={l.id} className="agro-panel"><h2>{l.commodityName} — {l.quantity.toString()} {l.unit}</h2><p>Requested type or grade must be supported by the latest accepted physical inspection; unlisted products require classification before matching.</p>
  <h3>Candidate supply proposals</h3>{l.matchProposals.length?l.matchProposals.map(m=><article key={m.id} className="agro-record"><div><strong>{m.supply.farmer.fullName}</strong><p>{m.quantity.toString()} {m.unit} · {m.status} · {m.note??"No internal note"}</p></div>{assigned&&m.status==="CANDIDATE"&&<ActionButton label="Invite farmer" endpoint={"/api/operations/matching/"+m.id+"/invite"} body={{}}/>}</article>):<p>No matching candidates yet.</p>}
  {assigned&&<><h3>Find evidence-backed approved supply</h3><MatchBuilder requestLineId={l.id} supplies={eligible.get(l.id)??[]}/></>}
 </section>)}
 {request.quotation?<section className="agro-panel"><h2>Commercial quotation</h2><p>Current status: {request.quotation.status}</p><Link className="action action-primary" href={"/operations/quotes/"+request.quotation.id}>Review quotation and approval</Link></section>:null}
 {assigned&&(!request.quotation||["DRAFT","REJECTED","DECLINED","EXPIRED"].includes(request.quotation.status))&&<QuoteBuilder requestId={request.id} rows={rows} expectedVersion={request.quotation?.version}/>}
 <div className="agro-alert">Matching and farmer interest are not stock reservation or contractual fulfilment. Quote prices are explicit Operations inputs, never implied by catalogue or supply records.</div>
 </PortalFrame>;
}
