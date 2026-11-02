import Link from "next/link";
import {notFound} from "next/navigation";
import {requirePortal,PortalFrame,StateTag} from "@/components/agriculture/portal-frame";
import {EnquiryStatusForm} from "@/components/public/enquiry-status-form";
export const dynamic="force-dynamic";
export default async function EnquiryDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const {account,db}=await requirePortal("OPERATIONS");
 if(!/^[0-9a-fA-F-]{36}$/.test(id))notFound();
 const e=await db.publicEnquiry.findUnique({where:{id}});if(!e)notFound();
 const replySubject=encodeURIComponent(`Re: ${e.subject}`);
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/enquiries" title="Contact Enquiry" subtitle="Private business enquiry — only authorized Operations staff may view or update its review status.">
 <Link className="action action-outline" href="/operations/enquiries">← Enquiry inbox</Link>
 <section className="agro-panel"><div className="agro-record"><h2>{e.subject}</h2><StateTag status={e.status}/></div>
 <dl className="public-information-panel"><div><dt>Sender</dt><dd>{e.fullName}</dd></div><div><dt>Audience</dt><dd>{e.audience}</dd></div><div><dt>Organisation</dt><dd>{e.organisation||"Not provided"}</dd></div><div><dt>Email</dt><dd><a href={`mailto:${encodeURIComponent(e.email)}?subject=${replySubject}`}>{e.email}</a></dd></div><div><dt>Phone</dt><dd>{e.phone||"Not provided"}</dd></div><div><dt>Product reference</dt><dd>{e.productSlug||"None"}</dd></div><div><dt>Received</dt><dd>{e.createdAt.toLocaleString("en-NG")}</dd></div></dl>
 <h3 className="font-bold my-3">Message</h3><p className="whitespace-pre-wrap">{e.message}</p>
 <p className="agro-hint">Reply opens your email application. Replies are not automatically saved to this platform.</p>
 <a className="action action-outline" href={`mailto:${encodeURIComponent(e.email)}?subject=${replySubject}`}>Reply by email</a>
 </section><EnquiryStatusForm id={e.id} current={e.status}/>
 </PortalFrame>
}
