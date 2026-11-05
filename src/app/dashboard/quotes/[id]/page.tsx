import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
import {BuyerQuoteDecision} from "@/features/commerce/commerce-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerQuoteDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requireBuyerPage();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const member=await buyerMembership(db,account.id);if(!member)notFound();
 const quote=await db.quotation.findFirst({where:{id,request:{organizationId:member.organizationId},status:{in:["ISSUED","ACCEPTED","DECLINED","EXPIRED"]}},include:{request:{select:{reference:true}}}});
 if(!quote)notFound();
 const revision=await db.quoteRevision.findUnique({where:{quoteId_number:{quoteId:id,number:quote.currentRevision}},include:{lines:true}});
 if(!revision||!revision.issuedAt)notFound();
 const expired=revision.validUntil.getTime()<=Date.now();
 return <DashboardFrame role="BUYER" name={account.fullName} title="Official SmartHub Quotation" description={"Sourcing request "+quote.request.reference+" · revision "+quote.currentRevision}>
 <p className="buyer-back"><Link href="/dashboard/quotes">← All quotations</Link></p>
 <section className="buyer-panel"><div className="buyer-heading-row"><h2>Commercial offer</h2><StatusPill status={expired&&quote.status==="ISSUED"?"EXPIRED":quote.status}/></div>
 <p>Issued {revision.issuedAt.toLocaleString("en-NG")} · Valid until {revision.validUntil.toLocaleString("en-NG")} · Currency {revision.currency}</p>
 <p>Total: <strong>₦{revision.totalNgn.toString()}</strong></p><p>Written terms: {revision.terms}</p>
 {revision.lines.map(l=><article key={l.id} className="buyer-list-item"><div><strong>{l.description}</strong><p>{l.quantity.toString()} {l.unit} × ₦{l.unitPriceNgn.toString()} = ₦{l.totalNgn.toString()}</p></div></article>)}
 </section>
 {quote.status==="ISSUED"&&!expired?<BuyerQuoteDecision id={id} version={quote.version} owner={member.role==="OWNER"}/>:<section className="buyer-note">{expired&&quote.status==="ISSUED"?"This quotation has expired. Contact SmartHub for a revised offer.":"Your organization's recorded decision is "+quote.status.toLowerCase()+". No order or payment has been created."}</section>}
 </DashboardFrame>;
}
