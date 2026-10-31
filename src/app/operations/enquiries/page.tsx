import Link from "next/link";
import {requirePortal,PortalFrame,EmptyState,StateTag} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
const statuses=["NEW","IN_REVIEW","CLOSED"] as const;
export default async function EnquiryInbox({searchParams}:{searchParams:Promise<{status?:string;page?:string}>}){
 const {account,db}=await requirePortal("OPERATIONS");
 const params=await searchParams;const status=statuses.find(s=>s===params.status);const page=Math.min(Math.max(Number.parseInt(params.page??"1",10)||1,1),500);
 const where=status?{status}:{};
 const [items,total]=await Promise.all([db.publicEnquiry.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*25,take:25,select:{id:true,fullName:true,audience:true,subject:true,status:true,createdAt:true}}),db.publicEnquiry.count({where})]);
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/enquiries" title="Public Enquiries" subtitle="Review real contact-form submissions. Enquiries are not procurement requests, and replies are not sent automatically.">
 <div className="agro-toolbar"><Link className="action action-outline" href="/operations/enquiries">All ({total})</Link>{statuses.map(s=><Link className="action action-outline" key={s} href={`/operations/enquiries?status=${s}`}>{s.replaceAll("_"," ")}</Link>)}</div>
 {items.length?<div className="agro-data-list">{items.map(e=><article className="agro-record" key={e.id}><div><h2>{e.subject}</h2><p>{e.fullName} · {e.audience} · {e.createdAt.toLocaleDateString("en-NG")}</p></div><StateTag status={e.status}/><Link href={`/operations/enquiries/${e.id}`}>Open enquiry</Link></article>)}</div>:<EmptyState title="No matching enquiries" body="Only genuine saved contact messages appear here. An empty inbox does not imply that emails sent directly to SmartHub are tracked."/>}
 {total>25&&<nav aria-label="Enquiry pages" className="agro-toolbar">{page>1&&<Link className="action action-outline" href={`/operations/enquiries?page=${page-1}${status?`&status=${status}`:""}`}>Previous</Link>}<span>Page {page} · {total} enquiries</span>{page*25<total&&<Link className="action action-outline" href={`/operations/enquiries?page=${page+1}${status?`&status=${status}`:""}`}>Next</Link>}</nav>}
 </PortalFrame>
}
