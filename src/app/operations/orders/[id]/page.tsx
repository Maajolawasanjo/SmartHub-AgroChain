import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {PortalFrame,requirePortal,StateTag} from "@/components/agriculture/portal-frame";
import {ReleaseOrderForm} from "@/features/orders/order-actions";
import {PlanForm} from "@/features/fulfilment/fulfilment-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function OperationsOrderDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requirePortal("OPERATIONS");const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const order=await db.order.findUnique({where:{id},include:{
  organization:{select:{businessName:true}},revision:{select:{totalNgn:true,currency:true,terms:true,number:true}},
  quotation:{include:{request:{include:{assignment:true}}}},paymentObligation:{select:{id:true,status:true,verifiedAt:true}},fulfillmentPlan:{select:{id:true,status:true}},
  lines:{include:{reservation:true,lot:{include:{supply:{include:{farmer:{select:{fullName:true}},commodity:{select:{name:true}}}}}}}},
  events:{orderBy:{createdAt:"desc"},take:80,include:{actor:{select:{fullName:true}}}}
 }});
 if(!order)notFound();
 if(account.role==="OPERATIONS"&&order.quotation.request.assignment?.assignedToId!==account.id)notFound();
 const overdue=order.holdExpiresAt.getTime()<=Date.now();
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/orders" title={"Order "+order.reference} subtitle={"Verified physical sourcing hold · "+(order.organization.businessName??"Buyer")}>
 <div className="agro-toolbar"><Link href="/operations/orders">← Order register</Link><Link href={"/operations/quotes/"+order.quotationId}>Original quotation</Link><StateTag status={order.status}/></div>
 <section className="agro-panel"><h2>Commercial record</h2><p>Quoted total: ₦{order.revision.totalNgn.toString()} {order.revision.currency} · Quote revision {order.revision.number}</p><p>Reserved hold expiry: {order.holdExpiresAt.toLocaleString("en-NG")} {overdue&&order.status==="PENDING_PAYMENT"?"· Overdue for explicit release":""}</p><p>Approved commercial terms: {order.revision.terms}</p><p>{order.status==="PENDING_PAYMENT"?"Paystack payment is not yet independently verified.":order.status==="PAYMENT_VERIFIED"?"Paystack verification has been recorded; fulfilment remains a separate operational process.":order.status==="PAYMENT_REVIEW"?"Provider verification exception: DO NOT dispatch until financial resolution is independently confirmed.":""}</p>
 {order.paymentObligation&&<p>Payment obligation: {order.paymentObligation.status.replaceAll("_"," ")} · <Link href={"/operations/payments/"+order.paymentObligation.id}>View provider reconciliation</Link></p>}</section>
 {order.fulfillmentPlan?<section className="agro-panel"><h2>Physical fulfilment plan</h2><p>Plan: {order.fulfillmentPlan.status.replaceAll("_"," ")}</p><Link className="action action-primary" href={"/operations/fulfilment/plan/"+order.fulfillmentPlan.id}>Manage shipments and delivery evidence</Link></section>:["PAYMENT_VERIFIED","FULFILLING"].includes(order.status)&&order.paymentObligation?.status==="PAID"?<PlanForm orderId={order.id} preset={{method:order.quotation.request.fulfilmentMethod??"",state:order.quotation.request.deliveryState??"",city:order.quotation.request.deliveryCity??"",address:order.quotation.request.deliveryAddress??""}}/>:null}
 <section className="agro-panel"><h2>Physical lot allocations</h2>{order.lines.map(l=><article className="agro-record" key={l.id}><div><strong>{l.description} · {l.quantity.toString()} {l.unit}</strong><p>Line total ₦{l.totalNgn.toString()} · Unit price ₦{l.unitPriceNgn.toString()}</p><p>Source: {l.lot.supply.commodity.name} · Farmer {l.lot.supply.farmer.fullName}</p><p>Reservation: {l.reservation?.status??"Missing"} · Lot location: {l.lot.locationNote}</p><p>Held {l.lot.reservedQuantity.toString()} {l.lot.unit} across orders; consumed {l.lot.consumedQuantity.toString()} {l.lot.unit}</p></div></article>)}</section>
 {order.status==="PENDING_PAYMENT"&&<ReleaseOrderForm id={id} version={order.version} holdExpired={overdue}/>}
 <section className="agro-panel"><h2>Audited order timeline</h2>{order.events.map(e=><article className="agro-record" key={e.id}><div><strong>{e.status.replaceAll("_"," ")}</strong><p>{e.createdAt.toLocaleString("en-NG")} · {e.actor.fullName}</p>{e.note&&<p>{e.note}</p>}</div></article>)}</section>
 <div className="agro-alert">These are secured physical sourcing holds. Order cancellation may release ACTIVE reservations only; consumed physical quantity is never restored as free stock.</div>
 </PortalFrame>;
}
