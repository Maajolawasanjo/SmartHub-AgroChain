import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerOrderDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requireBuyerPage();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const member=await buyerMembership(db,account.id);if(!member)notFound();
 const order=await db.order.findFirst({where:{id,organizationId:member.organizationId},include:{
  revision:{select:{totalNgn:true,currency:true,terms:true,number:true}},
  lines:{select:{id:true,description:true,quantity:true,unit:true,unitPriceNgn:true,totalNgn:true}},
  events:{orderBy:{createdAt:"desc"},select:{id:true,status:true,createdAt:true}}
 }});
 if(!order)notFound();
 return <DashboardFrame role="BUYER" name={account.fullName} title={"Order "+order.reference} description="Official SmartHub order record; supplier identities remain managed by SmartHub.">
 <p className="buyer-back"><Link href="/dashboard/orders">← All orders</Link></p>
 <section className="buyer-panel"><div className="buyer-heading-row"><h2>Order summary</h2><StatusPill status={order.status}/></div>
 <p>Created: {order.createdAt.toLocaleString("en-NG")} · Reservation hold ends: {order.holdExpiresAt.toLocaleString("en-NG")}</p>
 <p>Quoted total: <strong>₦{order.revision.totalNgn.toString()} {order.revision.currency}</strong></p>
 <p>Accepted quotation revision: {order.revision.number} · Terms: {order.revision.terms}</p>
 {order.lines.map(l=><article className="buyer-list-item" key={l.id}><div><strong>{l.description}</strong><p>{l.quantity.toString()} {l.unit} × ₦{l.unitPriceNgn.toString()} = ₦{l.totalNgn.toString()}</p></div></article>)}</section>
 <section className="buyer-panel"><h2>Recorded status history</h2><ol className="request-timeline">{order.events.map(e=><li key={e.id}><strong>{e.status.replaceAll("_"," ")}</strong><p>{e.createdAt.toLocaleString("en-NG")}</p></li>)}</ol></section>
 <section className="buyer-note"><strong>Payment is not live in this phase.</strong><p>An order marked pending payment is not a receipt or proof that SmartHub has verified any payment. Please use the official SmartHub communication channel for questions rather than sending funds to an unverified account.</p><Link href="/contact">Contact SmartHub support</Link></section>
 </DashboardFrame>;
}
