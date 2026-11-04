import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {PortalFrame,StateTag,requirePortal} from "@/components/agriculture/portal-frame";
import {OperationsRequestControls} from "@/features/requests/request-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerDemandDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requirePortal("OPERATIONS");const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const request=await db.buyerRequest.findUnique({where:{id},include:{organization:true,createdBy:{select:{fullName:true,email:true,phone:true}},
  lines:{orderBy:{position:"asc"}},events:{orderBy:{createdAt:"desc"},take:80,include:{actor:{select:{fullName:true}}}},
  clarifications:{orderBy:{askedAt:"desc"},take:30},assignment:{include:{assignedTo:{select:{fullName:true}}}}}});
 if(!request)notFound();
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/requests" title="Buyer Demand Review" subtitle={`Request ${request.reference} · managed procurement intake`}>
 <div className="agro-toolbar"><Link href="/operations/requests">← Demand queue</Link><StateTag status={request.status}/></div>
 <section className="agro-panel"><h2>Business and delivery context</h2><p>Business: {request.organization.businessName??"Not completed"} · {request.organization.businessType?.replaceAll("_"," ")??"Business type not recorded"}</p><p>Buyer contact: {request.organization.contactName??request.createdBy.fullName} · {request.organization.contactEmail??request.createdBy.email}</p><p>Business verification: {request.organization.verificationStatus} (not a universal prerequisite for initial requests)</p><p>Required date: {request.requiredDate?.toLocaleDateString("en-NG")??"Not recorded"}</p><p>Location: {[request.deliveryAddress,request.deliveryCity,request.deliveryState].filter(Boolean).join(", ")||"Not recorded"}</p><p>Fulfilment preference: {request.fulfilmentMethod?.replaceAll("_"," ")??"Not selected"}</p><p>Notes: {request.notes??"None"}</p><p>Submitted: {request.submittedAt?.toLocaleString("en-NG")??"Not submitted"}</p><p>Internal review target: {request.assignment?.dueAt?.toLocaleString("en-NG")??"Not set — no automatic SLA"}</p></section>
 <section className="agro-panel"><h2>Requested items</h2>{request.lines.length?request.lines.map(l=><article key={l.id} className="agro-record"><div><strong>{l.commodityName}</strong><p>{l.quantity.toString()} {l.unit} · {l.quantityFlexible?"Quantity flexible":"Fixed quantity"}</p><p>Variety: {l.variety??"Not specified"} · Packaging: {l.packaging??"Not specified"}</p><p>Quality notes: {l.qualityNotes??"Not specified"}</p><p>{l.commodityId?"Published catalogue reference":"Unlisted commodity — manual assessment needed"}</p></div></article>):<p>No submitted item lines.</p>}</section>
 {["SUBMITTED","UNDER_REVIEW","SOURCING_IN_PROGRESS"].includes(request.status)&&<OperationsRequestControls id={id} version={request.version} status={request.status} actorId={account.id} actorRole={account.role} assignedToId={request.assignment?.assignedToId??null} assignedToName={request.assignment?.assignedTo.fullName??null}/>}
 {request.status==="MORE_INFO_REQUIRED"&&<section className="agro-panel"><h2>Awaiting buyer clarification</h2><p>The buyer must respond before Operations can resume review. The current assignment is retained.</p></section>}
 <section className="agro-panel"><h2>Clarifications</h2>{request.clarifications.length?request.clarifications.map(c=><article className="agro-record" key={c.id}><div><strong>{c.question}</strong><p>Asked {c.askedAt.toLocaleString("en-NG")}</p><p>{c.answer?`Buyer answered: ${c.answer}`:"Awaiting buyer response"}</p></div></article>):<p>No clarification requests.</p>}</section>
 <section className="agro-panel"><h2>Audit-backed request timeline</h2>{request.events.length?request.events.map(e=><div className="agro-record" key={e.id}><div><strong>{e.kind.replaceAll("_"," ")}</strong><p>{e.actor.fullName} · {e.createdAt.toLocaleString("en-NG")} · {e.status.replaceAll("_"," ")}</p>{e.note&&<p>{e.note}</p>}</div></div>):<p>No recorded events.</p>}</section>
 <div className="agro-alert">This is a demand assessment, not an approved supply match, quote, payment or stock reservation. Only Phase 10 can issue official quotations.</div>
 </PortalFrame>;
}
