import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {NotificationPreferences} from "@/features/communications/communication-actions";
import {requireWorkspaceAccount} from "@/server/communications/inbox";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function NotificationSettings(){
 const {account,db}=await requireWorkspaceAccount();
 const prefs=await db.notificationPreference.findUnique({where:{accountId:account.id}});
 return <DashboardFrame role={account.role} name={account.fullName} title="Notifications & Preferences" description="Choose which noncritical updates appear in your private SmartHub inbox.">
 <p><Link className="action action-outline" href="/inbox">← Back to inbox</Link></p>
 <NotificationPreferences initial={{procurement:prefs?.procurement??true,finance:prefs?.finance??true,
  logistics:prefs?.logistics??true,support:prefs?.support??true}}/>
 <section className="agro-panel"><h2>Account security</h2><p>Authentication, contact verification and password changes use the verified account security flows.</p>
 <Link className="action action-outline" href="/account/security">Manage account security</Link></section>
 </DashboardFrame>;
}
