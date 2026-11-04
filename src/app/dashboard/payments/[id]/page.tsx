import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
import {StartPayment,VerifyPayment,RefundRequestForm} from "@/features/payments/payment-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const fmt=(minor:bigint)=>"₦"+(minor/100n).toLocaleString("en-NG")+"."+(minor%100n).toString().padStart(2,"0");
export default async function BuyerPaymentDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requireBuyerPage(),{id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 const membership=await buyerMembership(db,account.id);
 if(!membership)notFound();
 const obligation=await db.paymentObligation.findFirst({where:{id,organizationId:membership.organizationId},include:{
  order:{select:{id:true,reference:true,status:true,holdExpiresAt:true}},
  attempts:{orderBy:{createdAt:"desc"},take:10,include:{reconciliations:{orderBy:{checkedAt:"desc"},take:3}}},
  refunds:{orderBy:{createdAt:"desc"},take:3}
 }});
 if(!obligation)notFound();
 const canPay=membership.role==="OWNER"&&obligation.status==="UNPAID"&&obligation.order.status==="PENDING_PAYMENT"&&obligation.order.holdExpiresAt.getTime()>Date.now();
 return <DashboardFrame role="BUYER" name={account.fullName} title={"Payment for "+obligation.order.reference} description="Secure buyer obligations, Paystack verification, and auditable review outcomes.">
 <p className="buyer-back"><Link href="/dashboard/payments">← Payment records</Link></p>
 <section className="buyer-panel"><div className="buyer-heading-row"><h2>Payment obligation</h2><StatusPill status={obligation.status}/></div>
 <p>Authorized amount: <strong>{fmt(obligation.amountMinor)} {obligation.currency}</strong></p>
 <p>Order status: {obligation.order.status.replaceAll("_"," ")} · Reservation deadline: {obligation.order.holdExpiresAt.toLocaleString("en-NG")}</p>
 <p>Provider verification recorded: {obligation.verifiedAt?.toLocaleString("en-NG")??"Not yet verified"}</p><Link href={"/dashboard/orders/"+obligation.orderId}>Open associated order</Link></section>
 {obligation.attempts.length?<section className="buyer-panel"><h2>Payment attempts and verification history</h2>{obligation.attempts.map(a=><article key={a.id} className="buyer-list-item"><div><strong>{a.reference}</strong><p>Attempt: {a.status} · Started {a.createdAt.toLocaleString("en-NG")}</p>
 {a.reconciliations.map(r=><p key={r.id}>{r.checkedAt.toLocaleString("en-NG")} · {r.outcome} · Provider status: {r.providerStatus}</p>)}
 </div><StatusPill status={a.status}/>{membership.role==="OWNER"&&a.status!=="VERIFIED"&&<VerifyPayment id={a.id} role="buyer"/>}</article>)}</section>:<section className="buyer-panel"><p>No Paystack transaction has been initiated for this order.</p></section>}
 {canPay&&obligation.attempts.every(a=>!["READY","UNKNOWN","INITIATING","VERIFIED"].includes(a.status))&&<StartPayment orderId={obligation.orderId} canPay={canPay}/>}
 {obligation.status==="PAID"&&membership.role==="OWNER"&&(obligation.refunds.length? <section className="buyer-panel"><h2>Refund review case</h2>{obligation.refunds.map(c=><p key={c.id}>{c.status.replaceAll("_"," ")} · {c.createdAt.toLocaleString("en-NG")} · {c.reviewNote??"No decision yet"}</p>)}</section>:<RefundRequestForm obligationId={obligation.id}/>)}
 <p className="buyer-note">Payment verification is based on Paystack's authenticated server API. A webhook or browser redirect alone cannot credit an order. A payment needing review may require a refund or a new reservation decision.</p>
 </DashboardFrame>;
}
