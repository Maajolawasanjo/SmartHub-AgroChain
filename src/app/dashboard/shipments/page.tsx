import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceEmpty,StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerDeliveries(){
 const {account,db}=await requireBuyerPage(),member=await buyerMembership(db,account.id);
 const shipments=member?await db.shipment.findMany({where:{plan:{order:{organizationId:member.organizationId}}},
  orderBy:{createdAt:"desc"},take:60,select:{id:true,reference:true,status:true,carrierName:true,trackingReference:true,
  plan:{select:{destinationCity:true,destinationState:true,order:{select:{reference:true}}}},
  lines:{select:{quantity:true,orderLine:{select:{unit:true,description:true}}}},
  issue:{select:{status:true}},receipt:{select:{status:true}}}}):[];
 return <DashboardFrame role="BUYER" name={account.fullName} title="Pickup, Delivery & Receipts" description="Follow actual SmartHub-managed shipments and confirm only the quantities physically received.">
 <p className="buyer-back"><Link href="/dashboard/orders">← My orders</Link></p>
 {shipments.length?<section className="buyer-panel"><h2>Recorded shipments (latest 60)</h2><div className="buyer-list">{shipments.map(s=><article key={s.id} className="buyer-list-item"><div><h3>{s.reference} · {s.plan.order.reference}</h3><p>{s.lines.map(l=>l.orderLine.description+" · "+l.quantity.toString()+" "+l.orderLine.unit).join("; ")}</p><p>Destination {s.plan.destinationCity}, {s.plan.destinationState} · Carrier: {s.carrierName}</p><p>Receipt: {s.receipt?.status??"Not confirmed"}{s.issue?" · Issue "+s.issue.status:""}</p></div><StatusPill status={s.status}/><Link className="action action-outline" href={"/dashboard/shipments/"+s.id}>View and confirm delivery</Link></article>)}</div></section>:<WorkspaceEmpty title="No shipments have been scheduled" description="A provider-verified order and an explicit Operations shipment plan are required before any delivery record is visible." href="/dashboard/orders" action="Review orders"/>}
 <p className="buyer-note">A courier status of Delivered is only the carrier/Operations report. Your authorized receipt confirmation is separate and is never assumed from a tracking update.</p>
 </DashboardFrame>;
}
