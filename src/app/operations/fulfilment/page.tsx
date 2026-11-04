import Link from "next/link";
import type {Prisma} from "@/generated/prisma/client";
import {PortalFrame,requirePortal,EmptyState,StateTag} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function FulfilmentQueue(){
 const {account,db}=await requirePortal("OPERATIONS");
 const assigned:Prisma.OrderWhereInput=account.role==="SUPER_ADMIN"?{}:{
  quotation:{is:{request:{is:{assignment:{is:{assignedToId:account.id}}}}}}
 };
 const orders=await db.order.findMany({where:{...assigned,status:{in:["PAYMENT_VERIFIED","FULFILLING","COMPLETED","PAYMENT_REVIEW"]}},
  orderBy:{updatedAt:"desc"},take:70,include:{organization:{select:{businessName:true}},fulfillmentPlan:{select:{id:true,status:true,shipments:{select:{id:true,status:true}}}}}});
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/fulfilment" title="Physical Fulfilment & Deliveries" subtitle="Coordinate real pickup, transport, buyer receipt and issue resolution. Payment is necessary but never proof of delivery.">
 <div className="agro-toolbar"><Link href="/operations/orders">← Orders</Link><Link href="/operations/disputes">Dispute queue</Link></div>
 <section className="agro-panel"><h2>Paid and actively managed orders (latest 70)</h2>
 {orders.length?<div className="agro-data-list">{orders.map(o=><article key={o.id} className="agro-record"><div><strong>{o.reference}</strong><p>{o.organization.businessName??"Buyer organization"} · {o.fulfillmentPlan?.shipments.length??0} recorded shipments</p><p>Plan: {o.fulfillmentPlan?.status??"Not prepared"} · Order: {o.status}</p></div><StateTag status={o.status}/><Link href={o.fulfillmentPlan?"/operations/fulfilment/plan/"+o.fulfillmentPlan.id:"/operations/orders/"+o.id}>Open fulfilment</Link></article>)}</div>:<EmptyState title="No eligible fulfilment records" body="Only provider-verified paid orders or their subsequently managed delivery records appear here. Pending payment is never treated as ready to dispatch."/>}</section>
 <div className="agro-alert">PAYMENT_REVIEW orders are paused for provider exception handling. Even on a paid order, only a buyer-confirmed physical receipt may consume reserved quantities.</div>
 </PortalFrame>;
}
