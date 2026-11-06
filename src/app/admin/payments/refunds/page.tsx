import Link from "next/link";
import {StateTag,EmptyState} from "@/components/agriculture/portal-frame";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {getPrisma} from "@/server/db/prisma";
import {RefundReviewForm} from "@/features/payments/payment-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function RefundReviews(){
 const {account}=await requireSuperAdminPage();const db=getPrisma();
 const cases=await db.refundRequest.findMany({where:{status:{in:["REQUESTED","UNDER_REVIEW","RESOLUTION_REQUIRED"]}},
  orderBy:{createdAt:"asc"},take:60,include:{obligation:{include:{order:{select:{reference:true}},organization:{select:{businessName:true}}}},
   requestedBy:{select:{fullName:true}}}});
 return <DashboardFrame role="SUPER_ADMIN" name={account.fullName} title="Refund Review & Provider Resolution" description="Review buyer cases; no refund transfers or manual paid-state changes are permitted.">
 <div className="agro-toolbar"><Link href="/operations/payments">← Payment reconciliation</Link></div>
 <section className="agro-panel"><h2>Refund requests and unresolved cases (latest 60)</h2>
 {cases.length?<div className="agro-data-list">{cases.map(c=><article className="agro-record" key={c.id}><div>
 <h3>{c.obligation.order.reference} · {c.obligation.organization.businessName??"Buyer"}</h3><p>Request by {c.requestedBy.fullName} · {c.createdAt.toLocaleString("en-NG")}</p><p>Reason: {c.reason}</p><p>Current decision: {c.reviewNote??"Not reviewed"}</p>
 {["REQUESTED","UNDER_REVIEW"].includes(c.status)&&<RefundReviewForm id={c.id}/>}
 {c.status==="RESOLUTION_REQUIRED"&&<p className="agro-hint">Provider-side refund resolution and financial reconciliation are required. No disbursement or refund is claimed by this case status.</p>}
 </div><StateTag status={c.status}/></article>)}</div>:<EmptyState title="No unresolved refund cases" body="Only actual buyer-submitted refund requests appear here."/>}
 </section><div className="agro-alert">Review does not issue refunds or record a completed refund. A Paystack-verified refund or approved alternative financial resolution must be implemented and reviewed before any case can be closed as financially settled.</div>
 </DashboardFrame>;
}
