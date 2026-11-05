import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
import {BuyerReceiptForm,DeliveryIssueForm,EvidenceUploadForm} from "@/features/fulfilment/fulfilment-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerShipmentDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requireBuyerPage(),{id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 const member=await buyerMembership(db,account.id);if(!member)notFound();
 const shipment=await db.shipment.findFirst({where:{id,plan:{order:{organizationId:member.organizationId}}},select:{
  id:true,reference:true,status:true,carrierName:true,trackingReference:true,deliveredAt:true,createdAt:true,
  plan:{select:{destinationCity:true,destinationState:true,destinationAddress:true,method:true,
   order:{select:{id:true,reference:true,status:true,paymentObligation:{select:{status:true}}}}}},
  lines:{select:{id:true,quantity:true,orderLine:{select:{description:true,unit:true}}}},
  evidence:{where:{status:"READY"},orderBy:{createdAt:"asc"},select:{id:true,originalName:true,contentType:true}},
  events:{orderBy:{createdAt:"desc"},take:50,select:{kind:true,createdAt:true}},
  receipt:{select:{status:true,createdAt:true,lines:{select:{acceptedQuantity:true,shortageQuantity:true,shipmentLineId:true}}}},
  issue:{select:{status:true,category:true,description:true,reviewNote:true}}
 }});
 if(!shipment)notFound();
 const canReport=["DELIVERED","RECEIVED","PARTIAL_RECEIPT","ISSUE_REPORTED"].includes(shipment.status)&&shipment.deliveredAt&&Date.now()-shipment.deliveredAt.getTime()<=7*86400000;
 const canReceipt=member.role==="OWNER"&&["DELIVERED","ISSUE_REPORTED"].includes(shipment.status)&&!shipment.receipt&&shipment.plan.order.status==="FULFILLING"&&shipment.plan.order.paymentObligation?.status==="PAID";
 return <DashboardFrame role="BUYER" name={account.fullName} title={"Delivery "+shipment.reference} description={"Order "+shipment.plan.order.reference+" · "+shipment.plan.method.replaceAll("_"," ")}>
 <p className="buyer-back"><Link href="/dashboard/shipments">← All deliveries</Link> · <Link href={"/dashboard/orders/"+shipment.plan.order.id}>Open order</Link></p>
 <section className="buyer-panel"><div className="buyer-heading-row"><h2>Shipment details</h2><StatusPill status={shipment.status}/></div>
 <p>Carrier: {shipment.carrierName} · Tracking: {shipment.trackingReference??"Not recorded"}</p>
 <p>Destination: {shipment.plan.destinationAddress}, {shipment.plan.destinationCity}, {shipment.plan.destinationState}</p>
 <p>Operations-reported arrival: {shipment.deliveredAt?.toLocaleString("en-NG")??"Not yet reported"}</p>
 {shipment.lines.map(l=><div className="buyer-list-item" key={l.id}><strong>{l.orderLine.description}</strong><p>Sent: {l.quantity.toString()} {l.orderLine.unit}</p></div>)}</section>
 <section className="buyer-panel"><h2>Delivery timeline</h2>{shipment.events.length?shipment.events.map((e,i)=><p key={e.kind+"-"+i}>{e.createdAt.toLocaleString("en-NG")} · {e.kind.replaceAll("_"," ")}</p>):<p>No transport milestones yet.</p>}</section>
 {shipment.evidence.length>0&&<section className="buyer-panel"><h2>Authorized delivery attachments</h2>{shipment.evidence.map(e=><p key={e.id}><Link target="_blank" rel="noreferrer" href={"/api/shipments/"+shipment.id+"/evidence/"+e.id}>{e.originalName} ({e.contentType})</Link></p>)}</section>}
 {canReceipt&&<BuyerReceiptForm shipmentId={shipment.id} lines={shipment.lines.map(l=>({id:l.id,label:l.orderLine.description,unit:l.orderLine.unit,quantity:l.quantity.toString()}))}/>}
 {shipment.receipt&&<section className="buyer-panel"><h2>Your recorded receipt</h2><StatusPill status={shipment.receipt.status}/><p>Confirmed {shipment.receipt.createdAt.toLocaleString("en-NG")}</p>{shipment.receipt.lines.map(l=><p key={l.shipmentLineId}>Accepted: {l.acceptedQuantity.toString()} · Reported missing: {l.shortageQuantity.toString()}</p>)}</section>}
 {shipment.issue&&<section className="buyer-panel"><h2>Discrepancy under investigation</h2><StatusPill status={shipment.issue.status}/><p>{shipment.issue.category}: {shipment.issue.description}</p><p>{shipment.issue.reviewNote??"SmartHub is reviewing the evidence."}</p></section>}
 {member.role==="OWNER"&&canReport&&!shipment.issue&&<DeliveryIssueForm shipmentId={shipment.id}/>}
 {member.role==="OWNER"&&canReport&&<EvidenceUploadForm shipmentId={shipment.id}/>}
 <p className="buyer-note">Confirm only goods physically received. Recording a shortage does not automatically release supplier stock or trigger refunds or payouts. SmartHub will investigate it.</p>
 </DashboardFrame>;
}
