import Link from "next/link";
import {PortalFrame,requirePortal,StateTag,EmptyState} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function FarmerSupplyAllocations(){
 const {account,db}=await requirePortal("FARMER");
 const lines=await db.orderLine.findMany({where:{lot:{supply:{farmerId:account.id}}},orderBy:{order:{createdAt:"desc"}},take:60,
  select:{id:true,description:true,quantity:true,unit:true,order:{select:{reference:true,status:true,holdExpiresAt:true}},reservation:{select:{status:true}}}});
 return <PortalFrame role="FARMER" name={account.fullName} route="/farmer/orders" title="Supply Allocations" subtitle="See provisional quantity holds against your physical supply, without access to buyer or Operations commercial pricing.">
 <div className="agro-toolbar"><Link href="/farmer/opportunities">← Sourcing invitations</Link><Link href="/farmer/my-supply">My verified supply</Link></div>
 <section className="agro-panel"><h2>Recorded sourced allocations</h2>
 {lines.length?<div className="agro-data-list">{lines.map(l=><article className="agro-record" key={l.id}><div><strong>{l.description}</strong><p>{l.quantity.toString()} {l.unit} · Sourcing reference {l.order.reference}</p><p>Reservation: {l.reservation?.status??"Unconfirmed"} · Hold deadline {l.order.holdExpiresAt.toLocaleString("en-NG")}</p></div><StateTag status={l.order.status}/></article>)}</div>:<EmptyState title="No recorded supply allocations" body="Only quantities explicitly reserved by SmartHub Operations appear here. Invitations and farmer interest are not orders."/>}
 </section>
 <div className="agro-alert">A pending-payment buyer order is a provisional hold on physical supply, not a paid purchase or a guaranteed farmer settlement. Logistics and settlement remain separate later phases.</div>
 </PortalFrame>;
}
