import Link from "next/link";
import type {Prisma,PaymentObligationStatus} from "@/generated/prisma/client";
import {PortalFrame,requirePortal,StateTag,EmptyState} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const statuses=["UNPAID","PAID","REVIEW_REQUIRED","CANCELLED"] as const;
export default async function PaymentReconciliationQueue({searchParams}:{searchParams:Promise<{status?:string;page?:string}>}){
 const {account,db}=await requirePortal("OPERATIONS");
 const params=await searchParams;
 const status=statuses.find(x=>x===params.status) as PaymentObligationStatus|undefined;
 const page=Math.min(500,Math.max(1,Number.parseInt(params.page??"1",10)||1));
 const scope:Prisma.PaymentObligationWhereInput=account.role==="SUPER_ADMIN"?{}:{order:{is:{quotation:{is:{request:{is:{assignment:{is:{assignedToId:account.id}}}}}}}}};
 const where:Prisma.PaymentObligationWhereInput={...scope,...(status?{status}:{})};
 const [rows,total,unmatched]=await Promise.all([
  db.paymentObligation.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*25,take:25,
   include:{order:{select:{reference:true,status:true}},organization:{select:{businessName:true}},
    attempts:{orderBy:{createdAt:"desc"},take:1,select:{id:true,reference:true,status:true}}}}),
  db.paymentObligation.count({where}),
  account.role==="SUPER_ADMIN"?db.paymentProviderEvent.count({where:{status:"REVIEW_REQUIRED",attemptId:null}}):Promise.resolve(0)
 ]);
 const link=(s?:string,p=1)=>"/operations/payments?"+new URLSearchParams({...s?{status:s}:{},page:String(p)});
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/payments" title="Payment Verification & Reconciliation" subtitle="Review actual Paystack-backed obligations and exceptions, with no manual paid-state override.">
 <div className="agro-toolbar"><Link href="/operations/orders">← Orders register</Link>{account.role==="SUPER_ADMIN"&&<Link href="/admin/payments/refunds">Refund review queue</Link>}</div>
 <nav className="agro-toolbar" aria-label="Payment status filters">{[null,...statuses].map(s=><Link key={s??"all"} className={"action "+(status===s||!status&&!s?"action-primary":"action-outline")} href={link(s??undefined)}>{s?.replaceAll("_"," ")??"All"}</Link>)}</nav>
 <section className="agro-panel"><h2>{total} payment obligations</h2>
 {rows.length?<div className="agro-data-list">{rows.map(o=><article className="agro-record" key={o.id}><div><h3>{o.order.reference} · {o.organization.businessName??"Buyer organization"}</h3><p>NGN minor units: {o.amountMinor.toString()} · Order status: {o.order.status}</p><p>Latest attempt: {o.attempts[0]?.reference??"No Paystack transaction"} · {o.attempts[0]?.status??"Not started"}</p></div><StateTag status={o.status}/><Link href={"/operations/payments/"+o.id}>Inspect & reconcile</Link></article>)}</div>:<EmptyState title="No payment obligations match" body="Only existing server-recorded obligations appear. No example financial figures are generated."/>}
 </section>
 {total>25&&<nav className="agro-toolbar" aria-label="Payment pagination"><span>Page {page} / {Math.ceil(total/25)}</span>{page>1&&<Link href={link(status,page-1)}>Previous</Link>}{page*25<total&&<Link href={link(status,page+1)}>Next</Link>}</nav>}
 {account.role==="SUPER_ADMIN"&&<p className="agro-alert">{unmatched} signed provider events need investigation because they did not match a known payment attempt.</p>}
 <div className="agro-alert">Never reconcile from screenshots, manual receipt numbers, client redirects, or webhook bodies. Use the provider Verify Transaction API for every financial state transition.</div>
 </PortalFrame>;
}
