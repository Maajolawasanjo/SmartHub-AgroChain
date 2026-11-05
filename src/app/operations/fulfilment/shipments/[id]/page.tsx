import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {PortalFrame,requirePortal,StateTag} from "@/components/agriculture/portal-frame";
import {EvidenceUploadForm,MilestoneForm,IssueReviewForm} from "@/features/fulfilment/fulfilment-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function ShipmentOperationsDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requirePortal("OPERATIONS"),{id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const shipment=await db.shipment.findUnique({where:{id},include:{
  plan:{include:{order:{include:{quotation:{include:{request:{include:{assignment:true}}}},paymentObligation:{select:{status:true}}}}}},
  lines:{include:{orderLine:{select:{description:true,unit:true,quantity:true}}}},evidence:{orderBy:{createdAt:"desc"}},
  events:{orderBy:{createdAt:"desc"},take:80,include:{actor:{select:{fullName:true}}}},
  issue:{include:{reportedBy:{select:{fullName:true}},reviewedBy:{select:{fullName:true}}}},
  receipt:{include:{lines:{include:{shipmentLine:{select:{orderLineId:true}}}}}}
 }});
 if(!shipment)notFound();
 const order=shipment.plan.order;
 if(account.role!=="SUPER_ADMIN"&&order.quotation.request.assignment?.assignedToId!==account.id)notFound();
 const usable=shipment.evidence.map(e=>({id:e.id,name:e.originalName,used:shipment.events.some(ev=>ev.evidenceId===e.id)})).filter(e=>shipment.evidence.find(x=>x.id===e.id)?.status==="READY");
 const mayAct=shipment.plan.status==="ACTIVE"&&["PAYMENT_VERIFIED","FULFILLING"].includes(order.status)&&order.paymentObligation?.status==="PAID";
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/fulfilment" title={"Shipment "+shipment.reference} subtitle={shipment.carrierName+" · "+shipment.plan.destinationCity}>
 <div className="agro-toolbar"><Link href={"/operations/fulfilment/plan/"+shipment.planId}>← Fulfilment plan</Link><Link href={"/operations/orders/"+order.id}>Order {order.reference}</Link><StateTag status={shipment.status}/></div>
 <section className="agro-panel"><h2>Carrier and collection details (private)</h2><p>Carrier: {shipment.carrierName} · Contact: {shipment.carrierContact??"Not recorded"}</p><p>Vehicle: {shipment.vehicleNote??"Not recorded"} · Tracking: {shipment.trackingReference??"Not supplied"}</p>
 {shipment.lines.map(l=><p key={l.id}>{l.orderLine.description}: {l.quantity.toString()} {l.orderLine.unit} (ordered {l.orderLine.quantity.toString()})</p>)}</section>
 <section className="agro-panel"><h2>Private documentary evidence</h2>{shipment.evidence.length?shipment.evidence.map(e=><article key={e.id} className="agro-record"><span>{e.originalName} · {e.status} · {e.contentType}</span>{e.status==="READY"&&<Link href={"/api/shipments/"+shipment.id+"/evidence/"+e.id} target="_blank" rel="noreferrer">Open evidence</Link>}</article>):<p>No proof attached yet.</p>}</section>
 {mayAct&&!["RECEIVED","PARTIAL_RECEIPT","CANCELLED"].includes(shipment.status)&&<EvidenceUploadForm shipmentId={shipment.id}/>}
 {mayAct&&<MilestoneForm shipmentId={shipment.id} status={shipment.status} evidence={usable}/>}
 {shipment.receipt&&<section className="agro-panel"><h2>Buyer-attested receipt</h2><p>Result: {shipment.receipt.status}</p>{shipment.receipt.lines.map(l=><p key={l.id}>Line {l.shipmentLine.orderLineId.slice(0,8)}: accepted {l.acceptedQuantity.toString()} · reported shortfall {l.shortageQuantity.toString()}</p>)}</section>}
 {shipment.issue&&<section className="agro-panel"><h2>Delivery issue under investigation</h2><StateTag status={shipment.issue.status}/><p>Reported by {shipment.issue.reportedBy.fullName}: {shipment.issue.category} · {shipment.issue.description}</p><p>Review: {shipment.issue.reviewNote??"Not yet reviewed"}</p>{["OPEN","UNDER_REVIEW"].includes(shipment.issue.status)&&<IssueReviewForm issueId={shipment.issue.id}/>}</section>}
 <section className="agro-panel"><h2>Immutable delivery timeline</h2>{shipment.events.map(e=><article className="agro-record" key={e.id}><div><strong>{e.kind.replaceAll("_"," ")}</strong><p>{e.createdAt.toLocaleString("en-NG")} · {e.actor.fullName}</p><p>{e.note??"No note"}</p></div></article>)}</section>
 <div className="agro-alert">Pickup, dispatch and Operations-reported arrival are not buyer receipt. Only the buyer's confirmed, quantity-specific receipt consumes physical stock. Missing goods require documented review.</div>
 </PortalFrame>;
}
