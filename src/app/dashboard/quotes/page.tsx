import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceEmpty,StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerQuotations(){
 const {account,db}=await requireBuyerPage();const member=await buyerMembership(db,account.id);
 const quotes=member?await db.quotation.findMany({where:{request:{organizationId:member.organizationId},status:{in:["ISSUED","ACCEPTED","DECLINED","EXPIRED"]}},
  orderBy:{updatedAt:"desc"},take:50,include:{request:{select:{reference:true}},revisions:{orderBy:{number:"desc"},take:1}}}):[];
 return <DashboardFrame role="BUYER" name={account.fullName} title="Official Quotations" description="Review SmartHub-issued commercial proposals. Buyer and supplier contact remains mediated by SmartHub.">
 <p className="buyer-back"><Link href="/dashboard/requests">← My sourcing requests</Link></p>
 {quotes.length?<section className="buyer-panel"><h2>Issued and decided quotations</h2><div className="buyer-list">{quotes.map(q=><article className="buyer-list-item" key={q.id}><div><h3>{q.request.reference}</h3><p>Revision {q.currentRevision} · ₦{q.revisions[0]?.totalNgn.toString()??"Not recorded"} · Valid until {q.revisions[0]?.validUntil.toLocaleString("en-NG")??"Not recorded"}</p></div><StatusPill status={q.status}/><Link className="action action-outline" href={"/dashboard/quotes/"+q.id}>Review quotation</Link></article>)}</div></section>:<WorkspaceEmpty title="No issued quotations" description="When SmartHub Operations completes sourcing and an approved quotation is issued, it appears here. Unapproved drafts are never buyer-visible." href="/dashboard/requests" action="View requests"/>}
 <p className="buyer-note">Quotation acceptance does not create an order, transfer funds or reserve stock; those are subsequent controlled workflows.</p>
 </DashboardFrame>;
}
