import Link from "next/link";
import {notFound} from "next/navigation";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {requireWorkspaceAccount} from "@/server/communications/inbox";
import {supportCaseDetail} from "@/server/communications/support";
import {SupportMessageForm,SupportStateActions} from "@/features/communications/communication-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function SupportDetail({params}:{params:Promise<{id:string}>}){
 const {account}=await requireWorkspaceAccount(),{id}=await params;
 const record=await supportCaseDetail(id,account).catch(()=>null);
 if(!record)notFound();
 const staff=["OPERATIONS","SUPER_ADMIN"].includes(account.role);
 const owner=record.openedById===account.id;
 const canRespond=owner||staff&&(account.role==="SUPER_ADMIN"||record.assignedToId===account.id);
 return <DashboardFrame role={account.role} name={account.fullName} title={"Support "+record.reference} description={record.subject}>
 <div className="agro-toolbar"><Link href="/support">← All support cases</Link><Link href="/inbox">Inbox</Link></div>
 <section className="agro-panel"><h2>{record.category.replaceAll("_"," ")} · {record.status.replaceAll("_"," ")}</h2>
 <p>Opened by: {record.openedBy.fullName} · Assigned: {record.assignedTo?.fullName??"Not assigned"}</p>
 <p>Updated: {record.updatedAt.toLocaleString("en-NG")}</p>
 <p>Only authorized staff can access internal notes; the case owner only sees public replies.</p></section>
 <section className="agro-panel"><h2>Conversation · {record.messages.length} messages</h2>
 {record.messages.map(m=><article className="agro-record" key={m.id}><div>
 <strong>{m.author.fullName}{m.internal?" · Internal staff note":""}</strong>
 <p>{m.body}</p><p>{m.createdAt.toLocaleString("en-NG")}</p></div></article>)}</section>
 <SupportStateActions caseId={record.id} actorId={account.id} staff={staff} owner={owner}
  assigned={record.assignedToId} status={record.status}/>
 {canRespond&&record.status!=="CLOSED"&&<SupportMessageForm caseId={record.id} canInternal={staff}/>}
 {!canRespond&&staff&&<p className="agro-hint">Claim this case before responding. Its current assignee owns the active investigation.</p>}
 </DashboardFrame>;
}
