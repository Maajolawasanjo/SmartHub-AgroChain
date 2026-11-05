import Link from "next/link";
import type {Prisma,OrderStatus} from "@/generated/prisma/client";
import {PortalFrame,requirePortal,StateTag,EmptyState} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const states=["PENDING_PAYMENT","CANCELLED","EXPIRED","PAYMENT_VERIFIED","FULFILLING","COMPLETED"] as const;
export default async function OperationsOrders({searchParams}:{searchParams:Promise<{status?:string;page?:string}>}){
 const {account,db}=await requirePortal("OPERATIONS");const p=await searchParams;
 const status=states.find(s=>s===p.status) as OrderStatus|undefined;
 const page=Math.min(500,Math.max(1,Number.parseInt(p.page??"1",10)||1));
 const scope:Prisma.OrderWhereInput=account.role==="SUPER_ADMIN"?{}:{quotation:{is:{request:{is:{assignment:{is:{assignedToId:account.id}}}}}}};
 const where:Prisma.OrderWhereInput={...scope,...(status?{status}:{})};
 const [orders,total]=await Promise.all([
  db.order.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*20,take:20,
   include:{organization:{select:{businessName:true}},revision:{select:{totalNgn:true}},lines:{select:{description:true,quantity:true,unit:true}}}}),
  db.order.count({where})
 ]);
 const href=(s?:string,next=1)=>"/operations/orders?"+new URLSearchParams({...s?{status:s}:{},page:String(next)});
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/orders" title="Orders & Reserved Supply" subtitle="Pending-payment orders arise only after an accepted quote and explicit verified-stock reservation.">
 <div className="agro-toolbar"><Link href="/operations/matching">Supply matching</Link><Link href="/operations/inventory">Verified physical lots</Link></div>
 <nav className="agro-toolbar" aria-label="Filter orders">{[null,...states].map(s=><Link key={s??"all"} href={href(s??undefined)} className={"action "+(status===s||!status&&!s?"action-primary":"action-outline")}>{s?.replaceAll("_"," ")??"All"}</Link>)}</nav>
 <section className="agro-panel"><h2>{total} recorded orders</h2>
 {orders.length?<div className="agro-data-list">{orders.map(o=><article className="agro-record" key={o.id}><div><h3>{o.reference} · {o.organization.businessName??"Buyer organization"}</h3><p>{o.lines.map(l=>l.description+" · "+l.quantity.toString()+" "+l.unit).join("; ")}</p><p>Quoted ₦{o.revision.totalNgn.toString()} · Hold ends {o.holdExpiresAt.toLocaleString("en-NG")}</p></div><StateTag status={o.status}/><Link href={"/operations/orders/"+o.id}>Open order</Link></article>)}</div>:<EmptyState title="No matching orders" body="Only real orders created through authorized Operations reservation appear here."/>}
 </section>
 {total>20&&<nav className="agro-toolbar" aria-label="Order pagination"><span>Page {page} / {Math.ceil(total/20)}</span>{page>1&&<Link href={href(status,page-1)}>Previous</Link>}{page*20<total&&<Link href={href(status,page+1)}>Next</Link>}</nav>}
 <div className="agro-alert">Pending payment is a workflow state, not evidence that a payment obligation or charge was initialized. Payment verification is Phase 12; dispatch and receipt are Phase 13.</div>
 </PortalFrame>;
}
