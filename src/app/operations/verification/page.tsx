import Link from "next/link";
import {PortalFrame,StateTag,EmptyState,requirePortal} from "@/components/agriculture/portal-frame";
import type {Prisma,FarmerVerificationStatus} from "@/generated/prisma/client";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const statuses=["PENDING_REVIEW","MORE_INFO_REQUIRED","VERIFIED","REJECTED"] as const;
export default async function FarmerVerificationQueue({searchParams}:{searchParams:Promise<{status?:string;q?:string;page?:string}>}){
  const {account,db}=await requirePortal("OPERATIONS");
  const query=await searchParams;
  const status=(statuses.find(x=>x===query.status)||"PENDING_REVIEW") as FarmerVerificationStatus;
  const q=(query.q||"").trim().slice(0,80);
  const page=Math.min(500,Math.max(1,Number.parseInt(query.page||"1",10)||1));
  const where:Prisma.FarmerVerificationWhereInput={status,...(q?{farmer:{is:{OR:[{fullName:{contains:q,mode:"insensitive"}},{email:{contains:q,mode:"insensitive"}}]}}}:{})};
  const [rows,total]=await Promise.all([
    db.farmerVerification.findMany({where,orderBy:[{submittedAt:"asc"},{id:"asc"}],skip:(page-1)*25,take:25,
      select:{id:true,status:true,submittedAt:true,farmer:{select:{fullName:true,state:true}},_count:{select:{events:true}}}}),
    db.farmerVerification.count({where})
  ]);
  const assignments=await db.operationsReviewAssignment.findMany({where:{kind:"FARMER_VERIFICATION",subjectId:{in:rows.map(r=>r.id)}},include:{assignedTo:{select:{fullName:true}}}});
  const owners=new Map(assignments.map(a=>[a.subjectId,a.assignedTo.fullName]));
  const href=(nextStatus:string,nextPage=1)=>`/operations/verification?${new URLSearchParams({status:nextStatus,...(q?{q}:{}),page:String(nextPage)})}`;
  return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/verification" title="Farmer Verification" subtitle="Evidence-backed, assigned reviews of real farmer and farm records.">
    <nav className="agro-toolbar" aria-label="Filter verification queue">{statuses.map(s=><Link key={s} className={`action ${s===status?"action-primary":"action-outline"}`} href={href(s)}>{s.replaceAll("_"," ")}</Link>)}</nav>
    <form method="get" action="/operations/verification" className="agro-panel agro-toolbar"><input type="hidden" name="status" value={status}/><label htmlFor="farmer-search">Search farmer name or email</label><input id="farmer-search" name="q" maxLength={80} defaultValue={q}/><button type="submit" className="agro-button">Search</button></form>
    <section className="agro-panel"><h2>{total} {status.toLowerCase().replaceAll("_"," ")} case{total===1?"":"s"}</h2>
      {rows.length?<div className="agro-data-list">{rows.map(v=><div className="agro-record" key={v.id}><div><h3>{v.farmer.fullName}</h3><p>{v.farmer.state||"State not recorded"} · Submitted {v.submittedAt?.toLocaleDateString("en-NG")||"Not submitted"}</p><p>Reviewer: {owners.get(v.id)||"Unassigned"}</p></div><StateTag status={v.status}/><Link href={`/operations/verification/${v.id}`}>{status==="PENDING_REVIEW"?"Open review":"View history"}</Link></div>)}</div>:<EmptyState title="No matching verification cases" body="Change the status or search to find other real submissions."/>}
    </section>
    {total>25&&<nav className="agro-toolbar" aria-label="Verification queue pagination"><span>Page {page} of {Math.ceil(total/25)}</span>{page>1&&<Link href={href(status,page-1)}>Previous</Link>}{page*25<total&&<Link href={href(status,page+1)}>Next</Link>}</nav>}
  </PortalFrame>;
}
