import Link from "next/link";
import type {Prisma} from "@/generated/prisma/client";
import {PortalFrame,requirePortal,StateTag,EmptyState} from "@/components/agriculture/portal-frame";
import {ProposeSupplierPrice,CreatePayableAction} from "@/features/settlements/settlement-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const money=(v:bigint)=>"₦"+(v/BigInt(100)).toLocaleString("en-NG")+"."+(v%BigInt(100)).toString().padStart(2,"0");
export default async function SupplierFinanceQueue(){
 const {account,db}=await requirePortal("OPERATIONS");
 const scope:Prisma.OrderWhereInput=account.role==="SUPER_ADMIN"?{}:{
  quotation:{is:{request:{is:{assignment:{is:{assignedToId:account.id}}}}}}};
 const orders=await db.order.findMany({where:{...scope,status:{in:["PAYMENT_VERIFIED","FULFILLING","COMPLETED","PAYMENT_REVIEW"]}},
  orderBy:{updatedAt:"desc"},take:45,
  include:{paymentObligation:{select:{status:true}},fulfillmentPlan:{select:{status:true}},
   lines:{include:{lot:{include:{supply:{include:{farmer:{select:{fullName:true}}}}}},
    supplierAgreement:true,supplierObligation:true}}}});
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/settlements" title="Farmer Supplier Finance" subtitle="Manage negotiated supplier terms and completed-delivery payables independently from buyer sales revenue.">
 <div className="agro-toolbar"><Link href="/operations/fulfilment">← Fulfilment register</Link><Link href="/operations/payments">Buyer reconciliation</Link>{account.role==="SUPER_ADMIN"&&<Link href="/admin/settlements">Approval queue</Link>}</div>
 <section className="agro-panel"><h2>Supplier agreements and payables (recent 45 orders)</h2>
 {orders.length?orders.map(o=><section className="agro-record" key={o.id}><div><h3>{o.reference} · {o.status.replaceAll("_"," ")}</h3><p>Buyer payment: {o.paymentObligation?.status??"Unknown"} · Fulfilment: {o.fulfillmentPlan?.status??"Not complete"}</p></div>
 {o.lines.map(line=><div key={line.id} className="agro-panel"><h3>{line.description} · farmer {line.lot.supply.farmer.fullName}</h3><p>Purchased supply {line.quantity.toString()} {line.unit} · Source farmer-specific agreement, not buyer quotation price</p>
 {line.supplierAgreement?<p>Farmer unit price: ₦{line.supplierAgreement.unitPriceNgn.toString()} · Offer: {line.supplierAgreement.status}</p>:<p>No negotiated supplier offer recorded.</p>}
 {!line.supplierAgreement||line.supplierAgreement.status==="DECLINED"?<ProposeSupplierPrice orderLineId={line.id}/>:null}
 {line.supplierAgreement?.status==="ACCEPTED"&&!line.supplierObligation&&o.status==="COMPLETED"&&o.paymentObligation?.status==="PAID"&&o.fulfillmentPlan?.status==="COMPLETED"&&<CreatePayableAction agreementId={line.supplierAgreement.id}/>}
 {line.supplierObligation&&<><p>Payable: {money(line.supplierObligation.amountMinor)} · <strong>{line.supplierObligation.status}</strong></p><Link className="action action-outline" href={"/operations/settlements/"+line.supplierObligation.id}>Review payout and provider reconciliation</Link></>}
 </div>)}</section>):<EmptyState title="No paid orders within this queue" body="Operations must have real provider-verified buyer orders before proposing farmer supplier terms."/>}</section>
 <div className="agro-alert">Supplier unit costs require explicit farmer consent and are never copied from buyer sales prices. No supplier payable is authorized solely by a delivery event; only reconciled buyer receipt and completed fulfilment qualify.</div>
 </PortalFrame>;
}
