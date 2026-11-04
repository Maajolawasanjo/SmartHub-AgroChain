import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceEmpty,StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerRequestUpdates(){
 const {account,db}=await requireBuyerPage();const member=await buyerMembership(db,account.id);
 const events=member?await db.buyerRequestEvent.findMany({where:{request:{organizationId:member.organizationId}},orderBy:{createdAt:"desc"},take:50,
  include:{request:{select:{id:true,reference:true}}}}):[];
 return <DashboardFrame role="BUYER" name={account.fullName} title="Request Updates" description="Recorded changes to your business's sourcing requests. Email and push delivery are not enabled.">
 {events.length?<section className="buyer-panel"><h2>Recent request activity</h2><div className="buyer-list">{events.map(e=><article className="buyer-list-item" key={e.id}><div><strong>{e.kind.replaceAll("_"," ")}</strong><p>{e.request.reference} · {e.createdAt.toLocaleString("en-NG")}</p>{e.note&&<p>{e.note}</p>}</div><StatusPill status={e.status}/><Link href={`/dashboard/requests/${e.request.id}`}>View request</Link></article>)}</div></section>:<WorkspaceEmpty title="No request updates yet" description="Submission, clarification and review events will appear here once your business has sourcing activity." href="/dashboard/requests/new" action="Start a Buyer Request"/>}
 <p className="buyer-note">This is an in-app request activity feed, not a claim that email, SMS, push notifications or read/unread tracking has been delivered.</p>
 </DashboardFrame>;
}
