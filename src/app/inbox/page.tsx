import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {requireWorkspaceAccount,accountInbox} from "@/server/communications/inbox";
import {InboxAction,InboxReadAll,InboxRefresh} from "@/features/communications/communication-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function InboxPage(){
 const {account,db}=await requireWorkspaceAccount();
 const [rows,unread]=await Promise.all([
  accountInbox(account.id,60),db.notification.count({where:{accountId:account.id,readAt:null}})
 ]);
 return <DashboardFrame role={account.role} name={account.fullName} title="SmartHub Inbox" description="Private, account-scoped in-app business updates. Read receipts reflect inbox state, not email or SMS delivery.">
 <div className="agro-toolbar"><Link className="action action-outline" href="/settings/notifications">Notification preferences</Link><Link className="action action-outline" href="/support">Support cases</Link><InboxRefresh/><InboxReadAll/></div>
 <section className="agro-panel"><h2>Notifications · {unread} unread</h2>
 {rows.length?<div className="agro-data-list">{rows.map(n=><article key={n.id} className="agro-record">
 <div><strong>{n.readAt?"":"● "}{n.title}</strong><p>{n.body}</p><p>{n.category.replaceAll("_"," ")} · {n.createdAt.toLocaleString("en-NG")} · {n.readAt?"Read":"Unread"}</p></div>
 <div className="agro-actions"><Link href={n.actionPath} className="action action-primary">Open record</Link><InboxAction id={n.id} read={n.readAt!==null}/></div></article>)}</div>:<p>No notifications received yet. Only real actions that target your account can create inbox entries.</p>}
 </section>
 <p className="agro-hint">The inbox refreshes about every 20 seconds while this page is open. Browser notifications, email, SMS and push delivery are not claimed.</p>
 </DashboardFrame>;
}
