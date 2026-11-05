import Link from "next/link";
import {Prisma} from "@/generated/prisma/client";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceTable,WorkspaceEmpty} from "@/components/dashboard/dashboard-ui";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {getPrisma} from "@/server/db/prisma";
import {GovernanceIncidentCreate} from "@/features/admin/governance-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function GovernanceQueue({searchParams}:{searchParams:Promise<{status?:string;severity?:string;page?:string}>}){
 const ctx=await requireSuperAdminPage(),params=await searchParams,db=getPrisma();
 const statuses=["OPEN","INVESTIGATING","MITIGATED","CLOSED"] as const;
 const severities=["LOW","MEDIUM","HIGH","CRITICAL"] as const;
 const status=statuses.find(x=>x===params.status),severity=severities.find(x=>x===params.severity);
 const page=Math.min(500,Math.max(1,Number.parseInt(params.page??"1",10)||1));
 const where:Prisma.GovernanceIncidentWhereInput={...(status?{status}:{}),...(severity?{severity}:{})};
 const [rows,total,openCount]=await Promise.all([
  db.governanceIncident.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*25,take:25,
   select:{id:true,reference:true,title:true,category:true,severity:true,status:true,version:true,createdAt:true,
    openedBy:{select:{fullName:true}},assignedTo:{select:{fullName:true}}}}),
  db.governanceIncident.count({where}),
  db.governanceIncident.count({where:{status:{not:"CLOSED"}}})
 ]);
 const link=(p:number)=>"/admin/governance?"+new URLSearchParams({...status?{status}:{},...severity?{severity}:{},page:String(p)});
 return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Governance Incidents & Investigations" description="Reason-coded, immutable case histories for financial exceptions, access risks, disputed delivery and operational controls.">
 <div className="staff-page-links"><Link href="/admin">← Administration</Link><Link href="/admin/reports">Reporting</Link><Link href="/admin/audit">Staff audit</Link></div>
 <section className="agro-panel"><h2>{openCount} incidents not yet closed</h2><p>Manual incident tracking does not change source account, payment, payout, delivery, or stock status.</p>
 <form action="/admin/governance" className="agro-toolbar">
 <select name="status" aria-label="Incident status" defaultValue={status??""}><option value="">All statuses</option>{statuses.map(x=><option key={x} value={x}>{x}</option>)}</select>
 <select name="severity" aria-label="Incident severity" defaultValue={severity??""}><option value="">All severities</option>{severities.map(x=><option key={x} value={x}>{x}</option>)}</select>
 <button type="submit" className="action action-primary">Filter</button></form>
 {rows.length?<WorkspaceTable caption="Recorded governance incident queue" columns={["Incident","Category","Severity","Current state","Owner","Created","Review"]}>
 <>{rows.map(r=><tr key={r.id}><td><strong>{r.reference}</strong><span className="staff-cell-subtitle">{r.title}</span></td>
 <td>{r.category.replaceAll("_"," ")}</td><td>{r.severity}</td><td>{r.status.replaceAll("_"," ")}</td>
 <td>{r.assignedTo?.fullName??"Not assigned"}</td><td>{r.createdAt.toLocaleDateString("en-NG")}</td>
 <td><Link href={"/admin/governance/"+r.id}>Inspect</Link></td></tr>)}</></WorkspaceTable>:
 <WorkspaceEmpty title="No matching governance incidents" description="Only documented incidents appear. Empty results do not mean risk and operational exceptions are absent."/>}
 <nav className="agro-toolbar" aria-label="Incident pagination"><span>{total} matching incidents · Page {page}</span>{page>1&&<Link href={link(page-1)}>Previous</Link>}{page*25<total&&<Link href={link(page+1)}>Next</Link>}</nav></section>
 <GovernanceIncidentCreate/>
 </DashboardFrame>;
}
