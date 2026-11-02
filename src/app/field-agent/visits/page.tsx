import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceEmpty,WorkspaceTable,StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireFieldAgentPage} from "@/server/field-agent/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const statuses=["DRAFT","IN_PROGRESS","SUBMITTED","REVIEWED","RETURNED","CANCELLED"] as const;
export default async function FieldVisits({searchParams}:{searchParams:Promise<{status?:string;page?:string}>}){
 const {account,db}=await requireFieldAgentPage();const params=await searchParams;const status=statuses.find(s=>s===params.status);const page=Math.min(Math.max(Number.parseInt(params.page||"1",10)||1,1),500);
 const assignments=await db.fieldAgentAssignment.findMany({where:{fieldAgentId:account.id,active:true},select:{state:true}});const states=assignments.map(a=>a.state);
 const where={fieldAgentId:account.id,farm:{is:{state:{in:states}}},...(status?{status}:{})};
 const [items,total]=states.length?await Promise.all([db.fieldVisit.findMany({where,orderBy:{updatedAt:"desc"},skip:(page-1)*25,take:25,select:{id:true,purpose:true,status:true,visitDate:true,submittedAt:true,updatedAt:true,farmer:{select:{fullName:true}},farm:{select:{name:true,state:true,lga:true}}}}),db.fieldVisit.count({where})]):[[],0];
 return <DashboardFrame role="FIELD_AGENT" name={account.fullName} title="Field Visits" description="Create and maintain visit reports for farms inside your active state assignments.">
  <div className="field-agent-home-actions"><Link className="agro-button" href="/field-agent/farmers">Find farmer / start visit</Link><Link className="action action-outline" href="/field-agent/reports">Submitted reports</Link></div>
  <div className="staff-filter-tabs"><Link className={!status?"is-current":""} href="/field-agent/visits">All visits</Link>{statuses.map(s=><Link className={status===s?"is-current":""} key={s} href={`/field-agent/visits?status=${s}`}>{s.replaceAll("_"," ")}</Link>)}</div>
  {states.length===0?<WorkspaceEmpty title="No active state assignments" description="Contact Operations or a Super Admin to request a field scope."/>:items.length?<WorkspaceTable caption="Your field visits" columns={["Visit date","Farmer / farm","Location","Purpose","Status","Action"]}>{items.map(v=><tr key={v.id}><td>{v.visitDate.toLocaleDateString("en-NG")}</td><td><strong>{v.farmer.fullName}</strong><span className="staff-cell-subtitle">{v.farm.name}</span></td><td>{v.farm.lga}, {v.farm.state}</td><td>{v.purpose.replaceAll("_"," ").toLowerCase()}</td><td><StatusPill status={v.status}/></td><td><Link className="staff-table-link" href={`/field-agent/visits/${v.id}`}>Open report →</Link></td></tr>)}</WorkspaceTable>:<WorkspaceEmpty title="No field visits found" description="Start a visit from an assigned farmer's farm. Only your visits in active state scopes are shown here." href="/field-agent/farmers" action="Find assigned farmers"/>}
  {total>25&&<nav className="staff-pagination"><span>{total} visits · Page {page}</span>{page>1&&<Link className="staff-secondary-button" href={`/field-agent/visits?${status?`status=${status}&`:""}page=${page-1}`}>Previous</Link>}{page*25<total&&<Link className="staff-secondary-button" href={`/field-agent/visits?${status?`status=${status}&`:""}page=${page+1}`}>Next</Link>}</nav>}
 </DashboardFrame>;
}
