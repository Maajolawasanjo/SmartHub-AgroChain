import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceEmpty,StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const fmt=(minor:bigint)=>"₦"+(minor/BigInt(100)).toLocaleString("en-NG")+"."+(minor%BigInt(100)).toString().padStart(2,"0");
export default async function BuyerPayments({searchParams}:{searchParams:Promise<{page?:string}>}){
 const {account,db}=await requireBuyerPage();
 const membership=await buyerMembership(db,account.id);
 const query=await searchParams,page=Math.min(500,Math.max(1,Number.parseInt(query.page??"1",10)||1));
 const where={organizationId:membership?.organizationId??"00000000-0000-4000-8000-000000000000"};
 const [rows,total]=membership?await Promise.all([
  db.paymentObligation.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*20,take:20,
   include:{order:{select:{reference:true,status:true}},attempts:{orderBy:{createdAt:"desc"},take:1,select:{status:true,reference:true}}}}),
  db.paymentObligation.count({where})
 ]):[[],0];
 return <DashboardFrame role="BUYER" name={account.fullName} title="Payments & Transactions" description="Manage verified, organization-owned payment obligations and provider-backed transaction history.">
 <div className="buyer-heading-row"><p>Every amount is generated from the actual accepted order. Only server-verified Paystack transactions can mark an order paid.</p><Link className="action action-outline" href="/dashboard/orders">View my orders</Link></div>
 {rows.length?<section className="buyer-panel"><h2>{total} recorded payment obligations</h2><div className="buyer-list">{rows.map(r=><article key={r.id} className="buyer-list-item"><div><h3>{r.order.reference}</h3><p>Amount due/recorded: {fmt(r.amountMinor)} {r.currency}</p><p>Order: {r.order.status.replaceAll("_"," ")} · Latest attempt: {r.attempts[0]?.status.replaceAll("_"," ")??"Not started"}</p></div><StatusPill status={r.status}/><Link href={"/dashboard/payments/"+r.id} className="action action-outline">Payment details</Link></article>)}</div></section>:<WorkspaceEmpty title="No payment records yet" description="Start from a pending order to create a secure, provider-backed payment obligation. Accepted quotations and drafts are not payments." href="/dashboard/orders" action="Review pending orders"/>}
 {total>20&&<nav className="request-pagination" aria-label="Payment pagination"><span>Page {page} of {Math.ceil(total/20)}</span>{page>1&&<Link href={"/dashboard/payments?page="+(page-1)}>Previous</Link>}{page*20<total&&<Link href={"/dashboard/payments?page="+(page+1)}>Next</Link>}</nav>}
 <p className="buyer-note">The callback page is not a payment receipt. A payment remains pending until SmartHub independently verifies the provider reference, amount, currency and payer, and updates its ledger.</p>
 </DashboardFrame>;
}
