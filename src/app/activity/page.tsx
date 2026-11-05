import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {requireWorkspaceAccount} from "@/server/communications/inbox";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function ActivityHistory(){
 const {account,db}=await requireWorkspaceAccount();
 const events=await db.auditEvent.findMany({where:{actorId:account.id},orderBy:{createdAt:"desc"},take:60,
  select:{id:true,action:true,createdAt:true}});
 return <DashboardFrame role={account.role} name={account.fullName} title="My Account Activity" description="Recorded server-side actions attributed to your authenticated account, with sensitive details excluded.">
 <p><Link className="action action-outline" href="/support">← Support</Link></p>
 <section className="agro-panel"><h2>Recent activity</h2>{events.length?
 events.map(e=><div key={e.id} className="agro-record"><strong>{e.action.replaceAll("_"," ")}</strong>
 <p>{e.createdAt.toLocaleString("en-NG")}</p></div>):<p>No recorded activity yet.</p>}</section>
 <p className="agro-hint">This view is limited to the most recent 60 events and is not a complete security or compliance export.</p>
 </DashboardFrame>;
}
