import Link from "next/link";
import {StateTag,EmptyState} from "@/components/agriculture/portal-frame";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {getPrisma} from "@/server/db/prisma";
import {ApprovePayableForm,ReconcilePayout} from "@/features/settlements/settlement-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const money=(v:bigint)=>"₦"+(v/BigInt(100)).toLocaleString("en-NG")+"."+(v%BigInt(100)).toString().padStart(2,"0");
export default async function AdminSupplierApprovals(){
 const {account}=await requireSuperAdminPage();const db=getPrisma();
 const records=await db.supplierObligation.findMany({where:{status:{in:["PENDING_APPROVAL","APPROVED","TRANSFER_PENDING","REVIEW_REQUIRED"]}},
  orderBy:{createdAt:"asc"},take:75,include:{
   farmer:{select:{fullName:true,payoutAccount:{select:{accountName:true,accountLast4:true,bankCode:true,status:true}}}},
   agreement:{select:{unitPriceNgn:true,proposedById:true,status:true,note:true}},
   orderLine:{select:{description:true,unit:true,order:{select:{reference:true,status:true,paymentObligation:{select:{status:true}},
    fulfillmentPlan:{select:{status:true}}}}}},
   attempts:{orderBy:{createdAt:"desc"},take:1,select:{id:true,status:true,reference:true}}
  }});
 return <DashboardFrame role="SUPER_ADMIN" name={account.fullName} title="Supplier Payout Governance" description="Independently approve farmer liabilities and investigate outward transfers. Operations cannot approve its own obligations.">
 <div className="agro-toolbar"><Link href="/operations/settlements">← Supplier terms queue</Link><Link href="/operations/payments">Buyer payment exceptions</Link><Link href="/operations/disputes">Delivery disputes</Link></div>
 <section className="agro-panel"><h2>Payables requiring financial oversight (latest 75)</h2>
 {records.length?records.map(p=><article className="agro-record" key={p.id}><div><strong>{p.orderLine.order.reference} · {p.orderLine.description}</strong><p>Farmer {p.farmer.fullName}; accepted supplier unit price ₦{p.agreement.unitPriceNgn.toString()} × {p.quantity.toString()} {p.orderLine.unit}</p>
 <p>Liability: <strong>{money(p.amountMinor)}</strong> NGN · Buyer order {p.orderLine.order.status} · Payment {p.orderLine.order.paymentObligation?.status??"Unknown"} · Fulfilment {p.orderLine.order.fulfillmentPlan?.status??"Unverified"}</p>
 <p>Paystack-verified farmer destination: {p.farmer.payoutAccount?.accountName??"Not registered"}, bank code {p.farmer.payoutAccount?.bankCode??"—"}, account ending ••••{p.farmer.payoutAccount?.accountLast4??"—"}</p>
 <p>Supplier offer by {p.agreement.proposedById} · Farmer offer {p.agreement.status} · Terms {p.agreement.note}</p>
 {p.status==="PENDING_APPROVAL"&&<ApprovePayableForm id={p.id}/>}
 {p.attempts[0]&&<><p>Transfer {p.attempts[0].reference}: {p.attempts[0].status}</p><ReconcilePayout id={p.attempts[0].id} role="admin"/></>}
 <Link className="action action-outline" href={"/operations/settlements/"+p.id}>Open entire supplier reconciliation history</Link>
 </div><StateTag status={p.status}/></article>):<EmptyState title="No unsettled or unresolved supplier obligations" body="This queue is based only on actual farmer-accepted, recorded payables."/>}</section>
 <div className="agro-alert">Approval authorizes the exact supplier liability and beneficiary only; it is not an executed transfer. Provider success is required before a payout is SETTLED. Disputed buyer payment, delivery or refund records block payout.</div>
 </DashboardFrame>;
}
