import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceCard,WorkspaceEmpty} from "@/components/dashboard/dashboard-ui";
import {requireFieldAgentPage} from "@/server/field-agent/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function FieldAgentHome(){
 const {account,db}=await requireFieldAgentPage();
 const assignments=await db.fieldAgentAssignment.findMany({where:{fieldAgentId:account.id,active:true},orderBy:{state:"asc"},select:{state:true}});
 const states=assignments.map(a=>a.state);const scope={fieldAgentId:account.id,farm:{is:{state:{in:states}}}};
 const [openVisits,submitted,reports]=await Promise.all([
  states.length?db.fieldVisit.count({where:{...scope,status:{in:["DRAFT","IN_PROGRESS","RETURNED"]}}}):0,
  states.length?db.fieldVisit.count({where:{...scope,status:"SUBMITTED"}}):0,
  states.length?db.fieldVisit.count({where:{...scope,status:"REVIEWED"}}):0,
 ]);
 return <DashboardFrame role="FIELD_AGENT" name={account.fullName} title="Field Operations" description="Record assigned farm visits, attach evidence and submit reports for independent Operations review.">
  {states.length===0?<WorkspaceEmpty title="No active state assignments" description="Your Field Agent workspace has no active state scope. Contact Operations or a Super Admin to request an assignment before accessing farmer records."/>:<><div className="field-agent-scope-note"><strong>Active field scope</strong><span>{states.join(" · ")}</span><p>Farmer and farm records are filtered to these assigned states. Exact location details are shown only on an authorized visit.</p></div><div className="staff-dashboard-grid"><WorkspaceCard title="Visits in progress" description="Draft, active or returned reports within your current scope."><strong className="staff-metric">{openVisits}</strong><Link className="staff-text-link" href="/field-agent/visits">Open field visits →</Link></WorkspaceCard><WorkspaceCard title="Awaiting Operations" description="Reports submitted and awaiting independent review."><strong className="staff-metric">{submitted}</strong><Link className="staff-text-link" href="/field-agent/reports">View submitted reports →</Link></WorkspaceCard><WorkspaceCard title="Reviewed reports" description="Reports accepted by Operations."><strong className="staff-metric">{reports}</strong><Link className="staff-text-link" href="/field-agent/reports?status=REVIEWED">Review history →</Link></WorkspaceCard></div><div className="field-agent-home-actions"><Link className="agro-button" href="/field-agent/farmers">Find assigned farmers</Link><Link className="action action-outline" href="/field-agent/visits">View field visits</Link></div></>}
 </DashboardFrame>;
}
