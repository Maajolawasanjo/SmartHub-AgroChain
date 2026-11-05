import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {PortalFrame,requirePortal,StateTag} from "@/components/agriculture/portal-frame";
import {ExecutePayout,ReconcilePayout} from "@/features/settlements/settlement-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const money=(v:bigint)=>"₦"+(v/BigInt(100)).toLocaleString("en-NG")+"."+(v%BigInt(100)).toString().padStart(2,"0");
export default async function SupplierObligationDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requirePortal("OPERATIONS"),{id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 const payable=await db.supplierObligation.findUnique({where:{id},include:{
  farmer:{select:{fullName:true,payoutAccount:{select:{accountLast4:true,bankCode:true,accountName:true,version:true,status:true}}}},
  agreement:{select:{status:true,unitPriceNgn:true,proposedById:true,note:true,acceptedAt:true}},
  orderLine:{include:{order:{include:{quotation:{include:{request:{include:{assignment:true}}}},paymentObligation:{select:{status:true}}}},
   reservation:{select:{status:true}}}},
  attempts:{orderBy:{createdAt:"desc"},take:10,include:{reconciliations:{orderBy:{checkedAt:"desc"},take:10}}}
 }});
 if(!payable)notFound();
 if(account.role!=="SUPER_ADMIN"&&payable.orderLine.order.quotation.request.assignment?.assignedToId!==account.id)notFound();
 const enabled=process.env.SUPPLIER_PAYOUTS_ENABLED==="true";
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/settlements" title="Supplier Payout and Verification" subtitle={payable.orderLine.order.reference+" · "+payable.farmer.fullName}>
 <div className="agro-toolbar"><Link href="/operations/settlements">← Supplier finance queue</Link><Link href={"/operations/orders/"+payable.orderLine.orderId}>Buyer order</Link><StateTag status={payable.status}/></div>
 <section className="agro-panel"><h2>Immutable supplier obligation</h2>
 <p>Commodity: {payable.orderLine.description} · Reconciled physical receipt: {payable.quantity.toString()} {payable.orderLine.unit}</p><p>Farmer-accepted price: ₦{payable.agreement.unitPriceNgn.toString()} per {payable.orderLine.unit}</p><p>Payable amount: <strong>{money(payable.amountMinor)}</strong> NGN</p>
 <p>Farm-side beneficiary: {payable.farmer.payoutAccount?.accountName??"Unverified"}, bank code {payable.farmer.payoutAccount?.bankCode??"—"}, ending ••••{payable.farmer.payoutAccount?.accountLast4??"—"}</p>
 <p>Approver: {payable.approvedById??"Independent approval pending"} · Approval date: {payable.approvedAt?.toLocaleString("en-NG")??"Not approved"}</p></section>
 {payable.status==="APPROVED"&&account.role==="OPERATIONS"&&payable.agreement.proposedById===account.id&&payable.attempts.length===0&&<ExecutePayout id={id} enabled={enabled}/>}
 {payable.attempts.length>0&&<section className="agro-panel"><h2>Paystack transfer attempts and reconciliation</h2>{payable.attempts.map(a=><article key={a.id} className="agro-record"><div><strong>{a.reference}</strong><p>Provider status: {a.status} · Last checked: {a.lastCheckedAt?.toLocaleString("en-NG")??"Never"}</p><p>Independently verified at: {a.verifiedAt?.toLocaleString("en-NG")??"Not settled"}</p>
 {a.reconciliations.map(r=><p key={r.id}>{r.checkedAt.toLocaleString("en-NG")} · {r.trigger} · {r.outcome}: {r.note}</p>)}</div>
 <ReconcilePayout id={a.id} role={account.role==="SUPER_ADMIN"?"admin":"operations"}/></article>)}</section>}
 <div className="agro-alert">Transfer initiation, OTP, queue or provider timeout does NOT prove farmer payment. Do not retry a transfer with an unknown reference. Only Paystack's verified success can mark SETTLED; disputes or reversals remain REVIEW_REQUIRED.</div>
 </PortalFrame>;
}
