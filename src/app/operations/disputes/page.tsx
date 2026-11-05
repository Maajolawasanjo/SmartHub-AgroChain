import Link from "next/link";
import type {Prisma} from "@/generated/prisma/client";
import {PortalFrame,requirePortal,EmptyState,StateTag} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function DeliveryDisputes(){
 const {account,db}=await requirePortal("OPERATIONS");
 const where:Prisma.DeliveryIssueWhereInput=account.role==="SUPER_ADMIN"?{}:{
  shipment:{is:{plan:{is:{order:{is:{quotation:{is:{request:{is:{assignment:{is:{assignedToId:account.id}}}}}}}}}}}}
 };
 const cases=await db.deliveryIssue.findMany({where,orderBy:{createdAt:"desc"},take:70,
  include:{reportedBy:{select:{fullName:true}},shipment:{select:{reference:true,plan:{select:{order:{select:{reference:true}}}}}}}});
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/disputes" title="Delivery Disputes & Shortages" subtitle="Review buyer-reported shortages, transport damage and quality issues. No silent quantity or payment adjustments.">
 <div className="agro-toolbar"><Link href="/operations/fulfilment">← Fulfilment queue</Link></div>
 <section className="agro-panel"><h2>Reported delivery issues (latest 70)</h2>{cases.length?<div className="agro-data-list">{cases.map(c=><article key={c.id} className="agro-record"><div><strong>{c.shipment.reference} · {c.shipment.plan.order.reference}</strong><p>{c.category} · {c.description}</p><p>Buyer reporter: {c.reportedBy.fullName} · {c.createdAt.toLocaleString("en-NG")}</p></div><StateTag status={c.status}/><Link href={"/operations/fulfilment/shipments/"+c.shipmentId}>Investigate evidence</Link></article>)}</div>:<EmptyState title="No delivery issues submitted" body="Only recorded buyer shortages or damaged/incorrect deliveries are displayed. No fictitious disputes are created."/>}</section>
 <div className="agro-alert">Investigation and resolution-required statuses do not imply that stock has been restocked, a refund paid or a supplier settlement authorized. Those decisions require separate reconciled evidence and approvals.</div>
 </PortalFrame>;
}
