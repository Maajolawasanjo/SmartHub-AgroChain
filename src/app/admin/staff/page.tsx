import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill,WorkspaceEmpty,WorkspaceTable} from "@/components/dashboard/dashboard-ui";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {STAFF_ROLES} from "@/server/admin/permissions";
import {getPrisma} from "@/server/db/prisma";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function StaffDirectory({searchParams}:{searchParams:Promise<{q?:string;role?:string;status?:string;page?:string}>}){
  const ctx=await requireSuperAdminPage();const db=getPrisma();const params=await searchParams;
  const q=(params.q??"").trim().slice(0,120);const role=STAFF_ROLES.includes(params.role as typeof STAFF_ROLES[number])?params.role as typeof STAFF_ROLES[number]:undefined;
  const status=["ACTIVE","SUSPENDED","DISABLED"].includes(params.status??"")?params.status as "ACTIVE"|"SUSPENDED"|"DISABLED":undefined;
  const page=Math.min(Math.max(Number.parseInt(params.page??"1",10)||1,1),500);const pageSize=25;
  const where={role:role??{in:[...STAFF_ROLES]},...(status?{status}:{}),...(q?{OR:[{fullName:{contains:q,mode:"insensitive" as const}},{email:{contains:q,mode:"insensitive" as const}}]}:{})};
  const [items,total]=await Promise.all([db.account.findMany({where,orderBy:[{createdAt:"desc"},{id:"asc"}],skip:(page-1)*pageSize,take:pageSize,
    select:{id:true,fullName:true,email:true,role:true,status:true,createdAt:true,fieldAgentAssignments:{where:{active:true},select:{state:true},orderBy:{state:"asc"}}}}),db.account.count({where})]);
  return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Staff directory" description="Only provisioned Field Agent and Operations accounts appear here.">
    <div className="staff-toolbar"><form className="staff-filter-form" method="get"><label className="staff-field"><span>Search staff</span><input name="q" defaultValue={q} placeholder="Name or email" maxLength={120}/></label><label className="staff-field"><span>Role</span><select name="role" defaultValue={role??""}><option value="">All staff roles</option><option value="FIELD_AGENT">Field Agent</option><option value="OPERATIONS">Operations</option></select></label><label className="staff-field"><span>Status</span><select name="status" defaultValue={status??""}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DISABLED">Disabled</option></select></label><button className="staff-primary-button" type="submit">Apply filters</button></form><div className="staff-actions"><Link className="staff-secondary-button" href="/admin/staff/invites">Invitations</Link><Link className="staff-primary-button" href="/admin/staff/invite">Invite staff</Link></div></div>
    {items.length?<WorkspaceTable caption="Staff directory" columns={["Staff member","Role","Status","Field scope","Joined","Actions"]}><>{items.map(item=><tr key={item.id}><td><strong>{item.fullName}</strong><span className="staff-cell-subtitle">{item.email}</span></td><td>{item.role==="FIELD_AGENT"?"Field Agent":"Operations"}</td><td><StatusPill status={item.status}/></td><td>{item.role==="FIELD_AGENT"?`${item.fieldAgentAssignments.length} active state${item.fieldAgentAssignments.length===1?"":"s"}`:"Not applicable"}</td><td>{item.createdAt.toLocaleDateString("en-NG")}</td><td><Link className="staff-table-link" href={`/admin/staff/${item.id}`}>Manage staff →</Link></td></tr>)}</></WorkspaceTable>:<WorkspaceEmpty title="No staff match these filters" description="Clear the filters or invite an approved Field Agent or Operations staff member." href="/admin/staff/invite" action="Invite staff"/>}
    <div className="staff-pagination"><span>{total} staff records · Page {page}</span>{page>1&&<Link className="staff-secondary-button" href={`/admin/staff?${new URLSearchParams({q,role:role??"",status:status??"",page:String(page-1)})}`}>Previous</Link>}{page*pageSize<total&&<Link className="staff-secondary-button" href={`/admin/staff?${new URLSearchParams({q,role:role??"",status:status??"",page:String(page+1)})}`}>Next</Link>}</div>
  </DashboardFrame>;
}
