import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
import {StartPayment} from "@/features/payments/payment-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerOrderDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requireBuyerPage();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const member=await buyerMembership(db,account.id);if(!member)notFound();
 const order=await db.order.findFirst({where:{id,organizationId:member.organizationId},include:{
  revision:{select:{totalNgn:true,currency:true,terms:true,number:true}},
  lines:{select:{id:true,description:true,quantity:true,unit:true,unitPriceNgn:true,totalNgn:true,reservation:{select:{status:true,expiresAt:true}}}},
  events:{orderBy:{createdAt:"desc"},select:{id:true,status:true,createdAt:true}}
 }});
 if(!order)notFound();
 const payment=await db.paymentObligation.findUnique({where:{orderId:order.id},select:{id:true,status:true}});
 const canPay=member.role==="OWNER"&&order.status==="PENDING_PAYMENT"&&order.holdExpiresAt.getTime()>Date.now()&&order.lines.length>0&&order.lines.every(l=>l.reservation?.status==="ACTIVE"&&l.reservation.expiresAt.getTime()>Date.now())&&(!payment||payment.status==="UNPAID");
 return <DashboardFrame role="BUYER" name={account.fullName} title={"Order "+order.reference} description="Official SmartHub order record; supplier identities remain managed by SmartHub.">
 <p className="buyer-back"><Link href="/dashboard/orders">← All orders</Link></p>
 <section className="buyer-panel"><div className="buyer-heading-row"><h2>Order summary</h2><StatusPill status={order.status}/></div>
 <p>Created: {order.createdAt.toLocaleString("en-NG")} · Reservation hold ends: {order.holdExpiresAt.toLocaleString("en-NG")}</p>
 <p>Quoted total: <strong>₦{order.revision.totalNgn.toString()} {order.revision.currency}</strong></p>
 <p>Accepted quotation revision: {order.revision.number} · Terms: {order.revision.terms}</p>
 {order.lines.map(l=><article className="buyer-list-item" key={l.id}><div><strong>{l.description}</strong><p>{l.quantity.toString()} {l.unit} × ₦{l.unitPriceNgn.toString()} = ₦{l.totalNgn.toString()}</p></div></article>)}</section>
 {payment&&<section className="buyer-panel"><h2>Payment record</h2><p>Payment obligation: {payment.status.replaceAll("_"," ")}</p><Link className="action action-outline" href={"/dashboard/payments/"+payment.id}>Review Paystack verification and attempts</Link></section>}
 {canPay&&<StartPayment orderId={order.id} canPay={canPay}/>}
 <section className="buyer-panel"><h2>Recorded status history</h2><ol className="request-timeline">{order.events.map(e=><li key={e.id}><strong>{e.status.replaceAll("_"," ")}</strong><p>{e.createdAt.toLocaleString("en-NG")}</p></li>)}</ol></section>
 <section className="buyer-note"><strong>Provider-verification boundary.</strong><p>An order marked pending payment is not a receipt or proof of collection. Use only the secure Paystack checkout if configured, then check the recorded provider status. Do not transfer funds to unverified accounts.</p><Link href="/contact">Contact SmartHub support</Link></section>
 </DashboardFrame>;
}
