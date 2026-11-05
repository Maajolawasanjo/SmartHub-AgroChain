import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {Prisma} from "@/generated/prisma/client";
import {PortalFrame,requirePortal,StateTag} from "@/components/agriculture/portal-frame";
import {ShipmentForm} from "@/features/fulfilment/fulfilment-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function FulfilmentPlanDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requirePortal("OPERATIONS"),{id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const plan=await db.fulfillmentPlan.findUnique({where:{id},include:{
  order:{include:{organization:{select:{businessName:true}},quotation:{include:{request:{include:{assignment:true}}}},lines:true,paymentObligation:{select:{status:true}}}},
  shipments:{orderBy:{createdAt:"desc"},include:{lines:{select:{orderLineId:true,quantity:true}},issue:{select:{status:true}}}}
 }});
 if(!plan)notFound();
 if(account.role!=="SUPER_ADMIN"&&plan.order.quotation.request.assignment?.assignedToId!==account.id)notFound();
 const allocations=new Map<string,Prisma.Decimal>();
 for(const shipment of plan.shipments.filter(s=>s.status!=="CANCELLED"))
  for(const line of shipment.lines)allocations.set(line.orderLineId,(allocations.get(line.orderLineId)??new Prisma.Decimal(0)).plus(line.quantity));
 const unallocated=plan.order.lines.map(l=>({id:l.id,label:l.description,unit:l.unit,
  available:l.quantity.minus(allocations.get(l.id)??new Prisma.Decimal(0)).toString()})).filter(l=>new Prisma.Decimal(l.available).gt(0));
 const eligible=["PAYMENT_VERIFIED","FULFILLING"].includes(plan.order.status)&&plan.order.paymentObligation?.status==="PAID"&&plan.status==="ACTIVE";
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/fulfilment" title={"Fulfilment "+plan.order.reference} subtitle={(plan.order.organization.businessName??"Buyer")+" · "+plan.method.replaceAll("_"," ")}>
 <div className="agro-toolbar"><Link href="/operations/fulfilment">← All fulfilments</Link><Link href={"/operations/orders/"+plan.orderId}>Original order</Link><StateTag status={plan.status}/></div>
 <section className="agro-panel"><h2>Confirmed destination / collection arrangement</h2><p>{plan.destinationAddress}, {plan.destinationCity}, {plan.destinationState}</p><p>Handling: {plan.handlingNote??"No additional handling notes"} · Order state: {plan.order.status}</p><p>Shipment planning allocations exclude only explicitly cancelled, uncollected shipments. Buyer-reported shortages stay under investigation, not silently released.</p></section>
 <section className="agro-panel"><h2>Real shipment history</h2>{plan.shipments.length?plan.shipments.map(s=><article key={s.id} className="agro-record"><div><strong>{s.reference}</strong><p>{s.lines.map(l=>l.quantity.toString()+" "+(plan.order.lines.find(x=>x.id===l.orderLineId)?.unit??"")+" · "+(plan.order.lines.find(x=>x.id===l.orderLineId)?.description??"")).join("; ")}</p><p>Current state: {s.status}{s.issue?" · Issue "+s.issue.status:""}</p></div><StateTag status={s.status}/><Link href={"/operations/fulfilment/shipments/"+s.id}>Open shipment</Link></article>):<p>No shipment records have been planned.</p>}</section>
 {eligible&&<ShipmentForm planId={plan.id} lines={unallocated}/>}
 {!eligible&&<div className="agro-alert">New shipments are blocked until payment is clear and all existing delivery disputes have been resolved by an approved reconciliation procedure. No stock or missing goods are silently restored.</div>}
 </PortalFrame>;
}
