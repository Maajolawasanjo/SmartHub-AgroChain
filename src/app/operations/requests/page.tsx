import Link from "next/link";
import type {Prisma,BuyerRequestStatus} from "@/generated/prisma/client";
import {PortalFrame,StateTag,EmptyState,requirePortal} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const statuses=["SUBMITTED","UNDER_REVIEW","MORE_INFO_REQUIRED","SOURCING_IN_PROGRESS","CLOSED","CANCELLED"] as const;
export default async function BuyerDemandQueue({searchParams}:{searchParams:Promise<{status?:string;q?:string;page?:string}>}){
 const {account,db}=await requirePortal("OPERATIONS");const query=await searchParams;
 const status=(statuses.find(s=>s===query.status)??"SUBMITTED") as BuyerRequestStatus;
 const q=(query.q??"").trim().slice(0,80);const page=Math.min(500,Math.max(1,Number.parseInt(query.page??"1",10)||1));
 const where:Prisma.BuyerRequestWhereInput={status,submittedAt:{not:null},...(q?{OR:[{reference:{contains:q,mode:"insensitive"}},{organization:{is:{businessName:{contains:q,mode:"insensitive"}}}}]}:{})};
 const [rows,total]=await Promise.all([db.buyerRequest.findMany({where,orderBy:[{submittedAt:"asc"},{id:"asc"}],skip:(page-1)*25,take:25,
  select:{id:true,reference:true,status:true,submittedAt:true,updatedAt:true,organization:{select:{businessName:true,state:true}},lines:{orderBy:{position:"asc"},take:3,select:{commodityName:true,quantity:true,unit:true}},assignment:{select:{assignedTo:{select:{fullName:true}}}}}}),db.buyerRequest.count({where})]);
 const href=(s:string,p=1)=>`/operations/requests?${new URLSearchParams({status:s,...q?{q}:{},page:String(p)})}`;
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/requests" title="Buyer Requests & Demand Queue" subtitle="Review real buyer requirements, ask for clarification and move complete requests into sourcing assessment.">
 <nav className="agro-toolbar" aria-label="Demand status filters">{statuses.map(s=><Link key={s} href={href(s)} className={`action ${s===status?"action-primary":"action-outline"}`}>{s.replaceAll("_"," ")}</Link>)}</nav>
 <form method="get" action="/operations/requests" className="agro-panel agro-toolbar" role="search"><input type="hidden" name="status" value={status}/><label htmlFor="demand-search">Reference or business name</label><input id="demand-search" name="q" maxLength={80} defaultValue={q}/><button type="submit" className="agro-button">Search</button></form>
 <section className="agro-panel"><h2>{total} {status.toLowerCase().replaceAll("_"," ")} request{total===1?"":"s"}</h2>{rows.length?<div className="agro-data-list">{rows.map(r=><article className="agro-record" key={r.id}><div><h3>{r.reference} · {r.organization.businessName??"Business profile incomplete"}</h3><p>{r.lines.map(l=>`${l.commodityName} · ${l.quantity.toString()} ${l.unit}`).join("; ")||"No submitted items"}</p><p>Submitted: {r.submittedAt?.toLocaleString("en-NG")??"Not submitted"} · Reviewer: {r.assignment?.assignedTo.fullName??"Unassigned"}</p></div><StateTag status={r.status}/><Link href={`/operations/requests/${r.id}`}>Open review</Link></article>)}</div>:<EmptyState title="No matching demand cases" body="Try a different status or search. Only actual buyer submissions appear here."/>}</section>
 {total>25&&<nav className="agro-toolbar" aria-label="Demand queue pagination"><span>Page {page} of {Math.ceil(total/25)}</span>{page>1&&<Link href={href(status,page-1)}>Previous</Link>}{page*25<total&&<Link href={href(status,page+1)}>Next</Link>}</nav>}
 <div className="agro-alert">A sourcing assessment does not approve stock, allocate supply, issue an official quote or create an order. No automatic SLA is promised.</div>
 </PortalFrame>;
}
