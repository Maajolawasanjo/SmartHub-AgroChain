import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceTable} from "@/components/dashboard/dashboard-ui";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {linkedSubject} from "@/server/admin/governance";
import {getPrisma} from "@/server/db/prisma";
import {GovernanceIncidentControls} from "@/features/admin/governance-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function GovernanceDetail({params}:{params:Promise<{id:string}>}){
 const ctx=await requireSuperAdminPage(),{id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 const db=getPrisma();
 const [incident,admins]=await Promise.all([
  db.governanceIncident.findUnique({where:{id},include:{
   openedBy:{select:{fullName:true}},assignedTo:{select:{fullName:true}},
   events:{orderBy:{createdAt:"asc"},include:{actor:{select:{fullName:true,role:true}}}}
  }}),
  db.account.findMany({where:{role:"SUPER_ADMIN",status:"ACTIVE"},orderBy:{fullName:"asc"},
   select:{id:true,fullName:true}})
 ]);
 if(!incident)notFound();
 const link=linkedSubject(incident.subjectType,incident.subjectId);
 return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title={"Governance "+incident.reference} description={incident.title}>
 <div className="staff-page-links"><Link href="/admin/governance">← Incident register</Link><Link href="/admin/reports">Operational reporting</Link></div>
 <section className="agro-panel"><h2>{incident.category.replaceAll("_"," ")} · {incident.severity}</h2>
 <p>Current state: <strong>{incident.status.replaceAll("_"," ")}</strong> · Version: {incident.version}</p>
 <p>{incident.description}</p>
 <p>Opened by {incident.openedBy.fullName} · Assigned: {incident.assignedTo?.fullName??"Not assigned"}</p>
 <p>Opened {incident.createdAt.toLocaleString("en-NG")} · Closed {incident.closedAt?.toLocaleString("en-NG")??"Not yet"}</p>
 {incident.subjectType&&<p>Linked real record: <strong>{incident.subjectType.replaceAll("_"," ")}</strong> · {incident.subjectId}
 {link&&<Link className="action action-outline" href={link}>Review source record</Link>}</p>}
 </section>
 <GovernanceIncidentControls id={incident.id} status={incident.status} version={incident.version}
  assignee={incident.assignedToId} admins={admins}/>
 <section className="agro-panel"><h2>Append-only governance decision history</h2>
 <WorkspaceTable caption="Governance incident decisions, accountable actors and reasons" columns={["Time","Action","Reason code","Author","Recorded rationale"]}>
 <>{incident.events.map(e=><tr key={e.id}><td>{e.createdAt.toLocaleString("en-NG")}</td>
 <td>{e.fromStatus??"NEW"} → {e.toStatus}</td><td>{e.reasonCode.replaceAll("_"," ")}</td>
 <td>{e.actor.fullName} ({e.actor.role})</td><td>{e.note}</td></tr>)}</></WorkspaceTable>
 </section>
 <div className="agro-alert">Mitigated and Closed are case-management statuses only; neither proves that a customer refund, bank transfer, stock return, shipment or account-status change has been completed. Verify independent source records and policies.</div>
 </DashboardFrame>;
}
