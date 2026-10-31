import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceEmpty,WorkspaceTable,StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireFieldAgentPage} from "@/server/field-agent/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const statuses=["SUBMITTED","REVIEWED","RETURNED"] as const;
export default async function FieldReports({searchParams}:{searchParams:Promise<{status?:string}>}){
 const {account,db}=await requireFieldAgentPage();const params=await searchParams;const status=statuses.find(s=>s===params.status);
 const assignments=await db.fieldAgentAssignment.findMany({where:{fieldAgentId:account.id,active:true},select:{state:true}});const states=assignments.map(a=>a.state);
 const where={fieldAgentId:account.id,farm:{is:{state:{in:states}}},status:{in:status?[status]:[...statuses]}};
 const items=states.length?await db.fieldVisit.findMany({where,orderBy:{submittedAt:"desc"},take:100,select:{id:true,purpose:true,status:true,visitDate:true,submittedAt:true,farmer:{select:{fullName:true}},farm:{select:{name:true,state:true,lga:true}}}}):[];
 return <DashboardFrame role="FIELD_AGENT" name={account.fullName} title="Submitted Reports" description="Track field reports after submission and review by Operations."><div className="staff-filter-tabs"><Link className={!status?"is-current":""} href="/field-agent/reports">All reports</Link>{statuses.map(s=><Link className={status===s?"is-current":""} key={s} href={`/field-agent/reports?status=${s}`}>{s.replaceAll("_"," ")}</Link>)}</div>{states.length===0?<WorkspaceEmpty title="No active state assignments" description="Your submitted reports are hidden outside your current active state scope."/>:items.length?<WorkspaceTable caption="Submitted field reports" columns={["Submitted","Farmer / farm","Location","Purpose","Status","Action"]}>{items.map(v=><tr key={v.id}><td>{v.submittedAt?.toLocaleDateString("en-NG")||"—"}</td><td><strong>{v.farmer.fullName}</strong><span className="staff-cell-subtitle">{v.farm.name}</span></td><td>{v.farm.lga}, {v.farm.state}</td><td>{v.purpose.replaceAll("_"," ").toLowerCase()}</td><td><StatusPill status={v.status}/></td><td><Link className="staff-table-link" href={`/field-agent/visits/${v.id}`}>Open report →</Link></td></tr>)}</WorkspaceTable>:<WorkspaceEmpty title="No submitted reports" description="Submitted field reports and Operations review outcomes will appear here." href="/field-agent/farmers" action="Find assigned farmers"/>}</DashboardFrame>;
}
