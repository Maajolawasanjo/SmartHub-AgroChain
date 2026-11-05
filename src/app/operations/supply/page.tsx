import Link from "next/link";
import {PortalFrame,StateTag,EmptyState,requirePortal} from "@/components/agriculture/portal-frame";
import type {Prisma,SupplyReviewStatus} from "@/generated/prisma/client";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const statuses=["PENDING_REVIEW","MORE_INFO_REQUIRED","APPROVED","REJECTED","WITHDRAWN"] as const;
export default async function SupplyReviewQueue({searchParams}:{searchParams:Promise<{status?:string;q?:string;page?:string}>}){
  const {account,db}=await requirePortal("OPERATIONS");
  const query=await searchParams;
  const status=(statuses.find(x=>x===query.status)||"PENDING_REVIEW") as SupplyReviewStatus;
  const q=(query.q||"").trim().slice(0,80);
  const page=Math.min(500,Math.max(1,Number.parseInt(query.page||"1",10)||1));
  const where:Prisma.SupplyDeclarationWhereInput={status,...(q?{OR:[{farmer:{is:{fullName:{contains:q,mode:"insensitive"}}}},{commodity:{is:{name:{contains:q,mode:"insensitive"}}}}]}:{})};
  const [rows,total]=await Promise.all([
    db.supplyDeclaration.findMany({where,orderBy:[{submittedAt:"asc"},{id:"asc"}],skip:(page-1)*25,take:25,
      select:{id:true,status:true,quantity:true,unit:true,submittedAt:true,farmer:{select:{fullName:true}},commodity:{select:{name:true}},farm:{select:{state:true}}}}),
    db.supplyDeclaration.count({where})
  ]);
  const assignments=await db.operationsReviewAssignment.findMany({where:{kind:"SUPPLY_DECLARATION",subjectId:{in:rows.map(r=>r.id)}},include:{assignedTo:{select:{fullName:true}}}});
  const owners=new Map(assignments.map(a=>[a.subjectId,a.assignedTo.fullName]));
  const href=(nextStatus:string,nextPage=1)=>`/operations/supply?${new URLSearchParams({status:nextStatus,...(q?{q}:{}),page:String(nextPage)})}`;
  return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/supply" title="Supply Review & Quality Control" subtitle="Review farmer-declared physical supply against accepted field evidence. No quantity is reserved by approval.">
    <nav className="agro-toolbar" aria-label="Filter supply queue">{statuses.map(s=><Link key={s} className={`action ${s===status?"action-primary":"action-outline"}`} href={href(s)}>{s.replaceAll("_"," ")}</Link>)}</nav>
    <form method="get" action="/operations/supply" className="agro-panel agro-toolbar"><input type="hidden" name="status" value={status}/><label htmlFor="supply-search">Search farmer or commodity</label><input id="supply-search" name="q" maxLength={80} defaultValue={q}/><button type="submit" className="agro-button">Search</button></form>
    <section className="agro-panel"><h2>{total} {status.toLowerCase().replaceAll("_"," ")} record{total===1?"":"s"}</h2>
      {rows.length?<div className="agro-data-list">{rows.map(s=><div className="agro-record" key={s.id}><div><h3>{s.commodity.name} · {s.quantity.toString()} {s.unit}</h3><p>{s.farmer.fullName} · {s.farm.state} · Submitted {s.submittedAt?.toLocaleDateString("en-NG")||"Not submitted"}</p><p>Reviewer: {owners.get(s.id)||"Unassigned"}</p></div><StateTag status={s.status}/><Link href={`/operations/supply/${s.id}`}>{status==="PENDING_REVIEW"?"Open review":"View history"}</Link></div>)}</div>:<EmptyState title="No matching supply cases" body="Change the status or search to find other real declarations."/>}
    </section>
    {total>25&&<nav className="agro-toolbar" aria-label="Supply queue pagination"><span>Page {page} of {Math.ceil(total/25)}</span>{page>1&&<Link href={href(status,page-1)}>Previous</Link>}{page*25<total&&<Link href={href(status,page+1)}>Next</Link>}</nav>}
  </PortalFrame>;
}
