import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
import {CancelRequest} from "@/features/requests/request-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerRequestDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requireBuyerPage();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const member=await buyerMembership(db,account.id);if(!member)notFound();
 const record=await db.buyerRequest.findFirst({where:{id,organizationId:member.organizationId},include:{lines:{orderBy:{position:"asc"}},events:{orderBy:{createdAt:"desc"},take:80},clarifications:{orderBy:{askedAt:"desc"},take:30}}});
 if(!record)notFound();const editable=["OWNER","EDITOR"].includes(member.role);
 return <DashboardFrame role="BUYER" name={account.fullName} title="Sourcing Request Details" description={`Reference ${record.reference}`}>
 <p className="buyer-back"><Link href="/dashboard/requests">← My Requests & Quotes</Link></p>
 <section className="buyer-panel"><div className="buyer-heading-row"><h2>{record.reference}</h2><StatusPill status={record.status}/></div><p>Submitted: {record.submittedAt?.toLocaleString("en-NG")??"Not submitted — draft"}</p><p>Required date: {record.requiredDate?.toLocaleDateString("en-NG")??"Not provided"}</p><p>Location: {[record.deliveryCity,record.deliveryState].filter(Boolean).join(", ")||"Not provided"}</p><p>Fulfilment preference: {record.fulfilmentMethod?.replaceAll("_"," ")??"Not provided"}</p><p>Delivery address: {record.deliveryAddress??"Not provided"}</p><p>Notes: {record.notes??"None"}</p>
 {record.status==="DRAFT"&&<p className="buyer-note">Draft information is saved privately; it has not been sent to Operations.</p>}
 </section>
 <section className="buyer-panel"><h2>Requested commodities</h2>{record.lines.length?<div className="buyer-list">{record.lines.map(l=><div className="buyer-list-item" key={l.id}><div><strong>{l.commodityName}</strong><p>{l.quantity.toString()} {l.unit} · {l.quantityFlexible?"Flexible quantity":"Fixed quantity"}</p><p>Variety: {l.variety??"Not specified"} · Packaging: {l.packaging??"Not specified"}</p><p>Quality notes: {l.qualityNotes??"To be discussed"}</p></div></div>)}</div>:<p>Draft item details will appear when submitted.</p>}</section>
 {record.status==="MORE_INFO_REQUIRED"&&<section className="buyer-alert"><h2>More information needed</h2><p>Operations has asked you to clarify your requirements before sourcing can continue.</p>{record.clarifications.filter(c=>!c.answeredAt).map(c=><p key={c.id}><strong>Question:</strong> {c.question}</p>)}{editable&&<Link className="action action-primary" href={`/dashboard/requests/${id}/information`}>Provide information</Link>}</section>}
 {record.status==="DRAFT"&&editable&&<section className="buyer-panel"><h2>Continue your draft</h2><Link href={`/dashboard/requests/${id}/information`} className="action action-primary">Edit or submit draft</Link></section>}
 {record.status==="SOURCING_IN_PROGRESS"&&<section className="buyer-note">SmartHub Operations is assessing sourcing options. No supplier match, stock reservation or official quote is implied.</section>}
 <section className="buyer-panel"><h2>Progress timeline</h2>{record.events.length?<ol className="request-timeline">{record.events.map(e=><li key={e.id}><strong>{e.kind.replaceAll("_"," ")}</strong><p>{e.createdAt.toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"})} · {e.status.replaceAll("_"," ")}</p>{e.note&&<p>{e.note}</p>}</li>)}</ol>:<p>No recorded events.</p>}</section>
 {record.clarifications.length>0&&<section className="buyer-panel"><h2>Clarification history</h2>{record.clarifications.map(c=><article className="buyer-list-item" key={c.id}><div><strong>{c.question}</strong><p>Asked {c.askedAt.toLocaleString("en-NG")}</p><p>{c.answer?`Your response: ${c.answer}`:"Awaiting your response"}</p></div></article>)}</section>}
 {editable&&["DRAFT","SUBMITTED","MORE_INFO_REQUIRED"].includes(record.status)&&<CancelRequest id={id} version={record.version}/>}
 </DashboardFrame>;
}
