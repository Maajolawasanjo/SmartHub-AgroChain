import Link from "next/link";
import {StateTag,EmptyState} from "@/components/agriculture/portal-frame";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {getPrisma} from "@/server/db/prisma";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function QuoteApprovalQueue(){
 const {account}=await requireSuperAdminPage();const db=getPrisma();
 const quotes=await db.quotation.findMany({where:{status:"PENDING_APPROVAL"},orderBy:{updatedAt:"asc"},take:60,
  include:{request:{select:{reference:true,organization:{select:{businessName:true}}}},revisions:{orderBy:{number:"desc"},take:1}}});
 return <DashboardFrame role="SUPER_ADMIN" name={account.fullName} title="Quotation Approval Queue" description="Review financial terms independently before Operations issues official quotations.">
 <div className="agro-toolbar"><Link href="/admin">← Platform governance</Link></div>
 <section className="agro-panel"><h2>Awaiting independent approval</h2>
 {quotes.length?<div className="agro-data-list">{quotes.map(q=><article key={q.id} className="agro-record"><div><strong>{q.request.reference} · {q.request.organization.businessName??"Buyer"}</strong><p>Revision {q.currentRevision} · Total ₦{q.revisions[0]?.totalNgn.toString()??"Not available"} · Updated {q.updatedAt.toLocaleString("en-NG")}</p></div><StateTag status={q.status}/><Link href={"/operations/quotes/"+q.id}>Review terms</Link></article>)}</div>:<EmptyState title="No quotations awaiting approval" body="Operations-prepared quotations will appear here when submitted for independent review."/>}
 </section><div className="agro-alert">Final commercial and legal policies must be client-approved before production issuance.</div>
 </DashboardFrame>;
}
