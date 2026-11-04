import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {PortalFrame,requirePortal,StateTag} from "@/components/agriculture/portal-frame";
import {VerifyPayment} from "@/features/payments/payment-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const fmt=(minor:bigint)=>"₦"+(minor/BigInt(100)).toLocaleString("en-NG")+"."+(minor%BigInt(100)).toString().padStart(2,"0");
export default async function PaymentReconciliationDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requirePortal("OPERATIONS");const {id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 const obligation=await db.paymentObligation.findUnique({where:{id},include:{
  order:{include:{quotation:{include:{request:{include:{assignment:true}}}}}},
  organization:{select:{businessName:true}},attempts:{orderBy:{createdAt:"desc"},take:25,
   include:{reconciliations:{orderBy:{checkedAt:"desc"},take:15},events:{orderBy:{receivedAt:"desc"},take:10}}},
  refunds:{orderBy:{createdAt:"desc"},take:10}
 }});
 if(!obligation)notFound();
 if(account.role==="OPERATIONS"&&obligation.order.quotation.request.assignment?.assignedToId!==account.id)notFound();
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/payments" title="Provider Reconciliation" subtitle={obligation.order.reference+" · "+(obligation.organization.businessName??"Buyer")}>
 <div className="agro-toolbar"><Link href="/operations/payments">← Payment queue</Link><Link href={"/operations/orders/"+obligation.orderId}>View order</Link><StateTag status={obligation.status}/></div>
 <section className="agro-panel"><h2>Financial obligation</h2><p>Original order amount: <strong>{fmt(obligation.amountMinor)}</strong> {obligation.currency} · Order: {obligation.order.status}</p>
 <p>Reservation deadline: {obligation.order.holdExpiresAt.toLocaleString("en-NG")} · Provider verified: {obligation.verifiedAt?.toLocaleString("en-NG")??"Not verified"}</p>
 <p>Only an exact provider-confirmed amount and authorized reference may produce PAYMENT_VERIFIED. A mismatched or late charge must remain in manual review.</p></section>
 <section className="agro-panel"><h2>Provider attempts & reconciliation history</h2>{obligation.attempts.length?obligation.attempts.map(a=><article className="agro-record" key={a.id}><div><strong>{a.reference}</strong><p>Attempt: {a.status} · Initiated {a.createdAt.toLocaleString("en-NG")}</p><p>Provider transaction ID: {a.providerTransactionId??"Not verified"}</p>
 <h3>Reconciliation checks</h3>{a.reconciliations.length?a.reconciliations.map(r=><p key={r.id}>{r.checkedAt.toLocaleString("en-NG")} · {r.trigger}: {r.outcome} · Provider status: {r.providerStatus}{r.note?" · "+r.note:""}</p>):<p>No provider checks recorded yet.</p>}
 <p>Signed events: {a.events.length} shown (most recent)</p></div><StateTag status={a.status}/><VerifyPayment id={a.id} role="operations"/></article>):<p>No payment has been initialized.</p>}</section>
 <section className="agro-panel"><h2>Refund review cases</h2>{obligation.refunds.length?obligation.refunds.map(r=><p key={r.id}>{r.status.replaceAll("_"," ")} · {r.reason} · {r.reviewNote??"Awaiting resolution"}</p>):<p>No submitted refund cases.</p>}</section>
 <div className="agro-alert">There is no manual mark-paid button. Reconciliation only changes paid state after Paystack verification with matching reference, amount, currency, payer and active order reservation.</div>
 </PortalFrame>;
}
