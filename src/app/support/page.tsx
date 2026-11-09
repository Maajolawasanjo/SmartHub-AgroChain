import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {getAccountContext} from "@/server/auth/context";
import {redirect} from "next/navigation";
import {supportCaseList} from "@/server/communications/support";
import {canReadPrivilegedSupportCases} from "@/server/communications/staff-mfa";
import {SupportOpenForm} from "@/features/communications/communication-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function SupportHome(){
 const ctx=await getAccountContext();
 if(!ctx||ctx.account.status!=="ACTIVE"||!ctx.user.email_confirmed_at)
  redirect("/login?next=%2Fsupport");
 const {account}=ctx;
 const cases=await supportCaseList(account);
 const staff=await canReadPrivilegedSupportCases(ctx);
 const staffRole=["OPERATIONS","SUPER_ADMIN"].includes(account.role);
 const mfaPath=account.role==="OPERATIONS"?"/account/security/operations-mfa":"/account/security/mfa";
 return <DashboardFrame role={account.role} name={account.fullName} title="Help & Support" description={staff?
  "Manage customer cases, claim investigations and respond without exposing private staff notes.":"Create support requests and follow the replies from SmartHub Operations."}>
 <div className="agro-toolbar"><Link className="action action-outline" href="/inbox">← Inbox</Link>
 <Link className="action action-outline" href="/activity">My activity history</Link></div>
 {staffRole&&!staff&&<p className="agro-alert">Only your own support cases are available until an authenticator challenge is completed. <Link href={mfaPath}>Open authenticator security</Link></p>}
 <section className="agro-panel"><h2>{staff?"Customer support queue":"My support cases"} ({cases.length} shown)</h2>
 {cases.length?<div className="agro-data-list">{cases.map(c=><article key={c.id} className="agro-record"><div>
 <strong>{c.reference} · {c.subject}</strong><p>{c.category.replaceAll("_"," ")} · {c.status.replaceAll("_"," ")} · Updated {c.updatedAt.toLocaleString("en-NG")}</p>
 {staff&&<p>Opened by {c.openedBy.fullName} · {c.assignedToId?"Assigned":"Awaiting assignment"}</p>}</div>
 <Link href={"/support/cases/"+c.id} className="action action-outline">Open conversation</Link></article>)}</div>:<p>No support cases are currently recorded.</p>}</section>
 <SupportOpenForm/>
 </DashboardFrame>;
}
