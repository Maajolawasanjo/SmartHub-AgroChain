import Link from "next/link";
import {PortalFrame,requirePortal,StateTag,EmptyState} from "@/components/agriculture/portal-frame";
import {BankDetailsForm,SupplierDecisionForm} from "@/features/settlements/settlement-actions";
import {listSupportedBanks} from "@/server/settlements/paystack-transfers";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const money=(v:bigint)=>"₦"+(v/BigInt(100)).toLocaleString("en-NG")+"."+(v%BigInt(100)).toString().padStart(2,"0");
export default async function FarmerSettlementPage(){
 const {account,db}=await requirePortal("FARMER");
 const [bank,agreements,payables,banks]=await Promise.all([
  db.farmerPayoutAccount.findUnique({where:{farmerId:account.id},select:{accountLast4:true,bankCode:true,accountName:true,status:true,verifiedAt:true}}),
  db.supplierAgreement.findMany({where:{farmerId:account.id},orderBy:{updatedAt:"desc"},take:60,
   include:{orderLine:{select:{quantity:true,unit:true,description:true,order:{select:{reference:true}}}}}}),
  db.supplierObligation.findMany({where:{farmerId:account.id},orderBy:{createdAt:"desc"},take:60,
   include:{orderLine:{select:{description:true,unit:true}},attempts:{orderBy:{createdAt:"desc"},take:1,
    select:{reference:true,status:true,verifiedAt:true}}}}),
  listSupportedBanks().catch(()=>[] as {code:string;name:string}[])
 ]);
 return <PortalFrame role="FARMER" name={account.fullName} route="/farmer/settlements" title="My Supply Payments & Settlements" subtitle="Real supplier agreements, approved payables and provider-verified outward payments. This is not a wallet balance.">
 <div className="agro-toolbar"><Link href="/farmer/orders">← Supply allocations</Link><Link href="/farmer/my-supply">My supply</Link></div>
 <section className="agro-panel"><h2>Private payout destination</h2>
 {bank?<p>Verified beneficiary: <strong>{bank.accountName}</strong> · Bank code {bank.bankCode} · Account ending <strong>••••{bank.accountLast4}</strong> · Verified {bank.verifiedAt.toLocaleDateString("en-NG")} · Status {bank.status}</p>:<p>No verified bank destination has been registered. Supplier payouts cannot be approved until this step is complete.</p>}</section>
 <BankDetailsForm banks={banks}/>
 <section className="agro-panel"><h2>Farmer commercial offers</h2>
 {agreements.length?agreements.map(a=><article className="agro-record" key={a.id}><div><strong>{a.orderLine.description} · {a.orderLine.order.reference}</strong>
 <p>Supplied quantity: {a.orderLine.quantity.toString()} {a.orderLine.unit}</p>
 <p>Offered farmer unit price: <strong>₦{a.unitPriceNgn.toString()}</strong> per {a.orderLine.unit}</p>
 <p>Negotiated terms: {a.note} · Version {a.version}</p>
 <p>This is a farmer-supply price; it does not disclose buyer margins, customer revenue or a promised payout.</p></div><StateTag status={a.status}/>{a.status==="PROPOSED"&&<SupplierDecisionForm id={a.id} version={a.version}/>}</article>)
 :<EmptyState title="No supplier offers yet" body="SmartHub Operations must record a distinct commercial offer. Buyer quotation acceptance does not create a farmer payment entitlement."/>}</section>
 <section className="agro-panel"><h2>Recorded supplier obligations</h2>
 {payables.length?payables.map(p=><article key={p.id} className="agro-record"><div><strong>{p.orderLine.description}</strong><p>Agreed, buyer-received quantity: {p.quantity.toString()} {p.orderLine.unit}</p><p>Obligation amount: {money(p.amountMinor)} {p.currency}</p>
 <p>Approval: {p.status.replaceAll("_"," ")} · Latest Paystack attempt: {p.attempts[0]?.status??"None"}</p>
 {p.attempts[0]&&<p>Transfer reference: {p.attempts[0].reference} · Provider-verified date: {p.attempts[0].verifiedAt?.toLocaleString("en-NG")??"Not verified"}</p>}
 </div><StateTag status={p.status}/></article>)
 :<EmptyState title="No payable recorded" body="A farmer-accepted price, fully buyer-confirmed delivery and independent approval are separate steps before any payment can be made."/>}</section>
 <div className="agro-alert">PENDING_APPROVAL and APPROVED are not paid funds. TRANSFER_PENDING is not paid funds. Only an independently Paystack-verified SETTLED record is displayed as settled. Contact SmartHub about any review-required transfer.</div>
 </PortalFrame>;
}
