import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill,WorkspaceEmpty} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerOrders({searchParams}:{searchParams:Promise<{page?:string}>}){
 const {account,db}=await requireBuyerPage();const member=await buyerMembership(db,account.id);const p=await searchParams;
 const page=Math.min(500,Math.max(1,Number.parseInt(p.page??"1",10)||1));
 const [orders,total]=member?await Promise.all([
  db.order.findMany({where:{organizationId:member.organizationId},orderBy:{createdAt:"desc"},skip:(page-1)*20,take:20,
   include:{revision:{select:{totalNgn:true,currency:true}},lines:{select:{description:true,quantity:true,unit:true}}}}),
  db.order.count({where:{organizationId:member.organizationId}})
 ]):[[],0];
 return <DashboardFrame role="BUYER" name={account.fullName} title="Orders & Fulfilment" description="Review your organization's real SmartHub-managed order records, including pending supply reservations.">
 <p className="buyer-back"><Link href="/dashboard/quotes">← Official quotations</Link></p>
 {orders.length?<section className="buyer-panel"><h2>{total} orders</h2><div className="buyer-list">{orders.map(o=><article className="buyer-list-item" key={o.id}><div><h3>{o.reference}</h3><p>{o.lines.map(l=>l.description+" · "+l.quantity.toString()+" "+l.unit).join("; ")}</p><p>Quoted total: ₦{o.revision.totalNgn.toString()} {o.revision.currency} · Created {o.createdAt.toLocaleString("en-NG")}</p><p>Supply reservation hold: {o.holdExpiresAt.toLocaleString("en-NG")}</p></div><StatusPill status={o.status}/><Link className="action action-outline" href={"/dashboard/orders/"+o.id}>View order</Link></article>)}</div></section>:<WorkspaceEmpty title="No orders yet" description="Only formally converted buyer-accepted quotations appear here. Request submission or quote acceptance alone does not reserve inventory." href="/dashboard/quotes" action="Review quotations"/>}
 {total>20&&<nav className="request-pagination" aria-label="Order pagination"><span>Page {page} / {Math.ceil(total/20)}</span>{page>1&&<Link href={"/dashboard/orders?page="+(page-1)}>Previous</Link>}{page*20<total&&<Link href={"/dashboard/orders?page="+(page+1)}>Next</Link>}</nav>}
 <p className="buyer-note">Pending payment does not mean a payment gateway or checkout has been activated. Do not transfer funds based solely on this record. Phase 12 will provide verified payment instructions.</p>
 </DashboardFrame>;
}
