import Link from "next/link";
import type {Prisma,BuyerRequestStatus} from "@/generated/prisma/client";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceEmpty,StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const statuses=["DRAFT","SUBMITTED","UNDER_REVIEW","MORE_INFO_REQUIRED","SOURCING_IN_PROGRESS","CLOSED","CANCELLED"] as const;
export default async function BuyerRequests({searchParams}:{searchParams:Promise<{status?:string;page?:string}>}){
 const {account,db}=await requireBuyerPage();const member=await buyerMembership(db,account.id);const params=await searchParams;
 const status=statuses.find(s=>s===params.status) as BuyerRequestStatus|undefined;
 const page=Math.min(500,Math.max(1,Number.parseInt(params.page??"1",10)||1));
 const where:Prisma.BuyerRequestWhereInput={organizationId:member?.organizationId??"00000000-0000-4000-8000-000000000000",...(status?{status}:{})};
 const [rows,total]=member?await Promise.all([db.buyerRequest.findMany({where,orderBy:{updatedAt:"desc"},skip:(page-1)*20,take:20,
  include:{lines:{orderBy:{position:"asc"},take:3}}}),db.buyerRequest.count({where})]):[[],0];
 const href=(s?:string,p=1)=>`/dashboard/requests?${new URLSearchParams({...s?{status:s}:{},page:String(p)})}`;
 return <DashboardFrame role="BUYER" name={account.fullName} title="My Requests & Quotes" description="Track your business's sourcing requests and Operations clarification decisions. Official quotations are not enabled yet.">
 <div className="buyer-heading-row"><p>Requests are assessed by SmartHub. Submitting does not guarantee supply or pricing.</p><Link href="/dashboard/requests/new" className="action action-primary">Start a Buyer Request</Link></div>
 <nav className="request-filters" aria-label="Filter sourcing requests"><Link className={!status?"request-filter-active":""} href={href()}>All</Link>{statuses.map(s=><Link key={s} className={status===s?"request-filter-active":""} href={href(s)}>{s.replaceAll("_"," ")}</Link>)}</nav>
 {rows.length?<section className="buyer-panel"><h2>{total} request{total===1?"":"s"}</h2><div className="buyer-list">{rows.map(r=><article key={r.id} className="buyer-list-item"><div><h3>{r.reference}</h3><p>{r.lines.length?r.lines.map(l=>`${l.commodityName} · ${l.quantity.toString()} ${l.unit}`).join("; "):"Draft — items not submitted"}</p><p>Last updated {r.updatedAt.toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"})}</p></div><StatusPill status={r.status}/><Link href={`/dashboard/requests/${r.id}`} className="action action-outline">{r.status==="MORE_INFO_REQUIRED"?"Provide information":"View request"}</Link></article>)}</div></section>:<WorkspaceEmpty title={status?"No requests match this status":"No sourcing requests yet"} description="Create a draft or submit a sourcing request to tell SmartHub what your business needs." href="/dashboard/requests/new" action="Start a Buyer Request"/>}
 {total>20&&<nav className="request-pagination" aria-label="Request pagination"><span>Page {page} of {Math.ceil(total/20)}</span>{page>1&&<Link href={href(status,page-1)}>Previous</Link>}{page*20<total&&<Link href={href(status,page+1)}>Next</Link>}</nav>}
 <p className="buyer-note">Quotations, proposal decisions, orders and payments are separate future workflows. Request status is not a quote or stock reservation.</p>
 </DashboardFrame>;
}
