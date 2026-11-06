import Link from "next/link";
import {Prisma} from "@/generated/prisma/client";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill,WorkspaceCard,WorkspaceEmpty,WorkspaceTable} from "@/components/dashboard/dashboard-ui";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {getPrisma} from "@/server/db/prisma";
import {isStaffRole,permissionsForRole} from "@/server/admin/permissions";

export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};

const trackedRoles=["FIELD_AGENT","OPERATIONS","SUPER_ADMIN"] as const;
const accountStatuses=["ACTIVE","SUSPENDED","DISABLED"] as const;
const pageSize=25;

/**
 * R01.3 restricted, read-only review of existing identities and static templates.
 * These counts do not verify Supabase email/MFA for OTHER staff users and do not
 * assert that privileged financial authority or individual grants are installed.
 */
export default async function AdminAccessReview({searchParams}:{searchParams:Promise<{q?:string;role?:string;status?:string;page?:string}>}){
 const ctx=await requireSuperAdminPage();
 const db=getPrisma(),params=await searchParams;
 const role=trackedRoles.includes(params.role as typeof trackedRoles[number])?params.role as typeof trackedRoles[number]:null;
 const status=accountStatuses.includes(params.status as typeof accountStatuses[number])?params.status as typeof accountStatuses[number]:null;
 const q=(params.q??"").trim().slice(0,80);
 const page=Math.min(500,Math.max(1,Number.parseInt(params.page??"1",10)||1));
 const where:Prisma.AccountWhereInput={
  role:role??{in:[...trackedRoles]},
  ...(status?{status}:{}),
  ...(q?{OR:[{fullName:{contains:q,mode:"insensitive"}},{email:{contains:q,mode:"insensitive"}}]}:{})
 };
 const [grouped,total,rows,pendingInvitations,activeScopes]=await Promise.all([
  db.account.groupBy({by:["role","status"],where:{role:{in:[...trackedRoles]}},_count:{_all:true}}),
  db.account.count({where}),
  db.account.findMany({where,orderBy:[{createdAt:"desc"},{id:"asc"}],skip:(page-1)*pageSize,take:pageSize,
   select:{id:true,fullName:true,role:true,status:true,createdAt:true,fieldAgentAssignments:{where:{active:true},select:{state:true},orderBy:{state:"asc"}}}}),
  db.staffInvitation.count({where:{status:"PENDING",expiresAt:{gt:new Date()}}}),
  db.fieldAgentAssignment.count({where:{active:true}})
 ]);
 const count=(roleName:typeof trackedRoles[number],accountStatus?:typeof accountStatuses[number])=>grouped.filter(x=>x.role===roleName&&(!accountStatus||x.status===accountStatus)).reduce((a,x)=>a+x._count._all,0);
 const countAll=(accountStatus?:typeof accountStatuses[number])=>grouped.filter(x=>!accountStatus||x.status===accountStatus).reduce((a,x)=>a+x._count._all,0);
 const link=(n:number)=>"/admin/access-review?"+new URLSearchParams({...q?{q}:{},...role?{role}:{},...status?{status}:{},page:String(n)});
 return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Staff Access Review" description="Read-only visibility into current staff role assignments, account states and Field Agent scopes. Not an individual-permission grant or privileged MFA verification screen.">
  <nav className="staff-page-links" aria-label="Access review links"><Link href="/admin">← Administration</Link><Link href="/admin/permissions">Role definitions</Link><Link href="/admin/staff">Staff directory</Link><Link href="/admin/audit">Audit history</Link></nav>
  <section className="staff-dashboard-grid" aria-label="Current access records">
   <WorkspaceCard title="Current internal accounts" description="Field Agent, Operations and Super Admin records."><strong className="staff-metric">{countAll()}</strong><p>Active {countAll("ACTIVE")} · Suspended {countAll("SUSPENDED")} · Disabled {countAll("DISABLED")}</p></WorkspaceCard>
   <WorkspaceCard title="Active Super Admin accounts" description="Source requires two designated accounts with separate responsibilities."><strong className="staff-metric">{count("SUPER_ADMIN","ACTIVE")}</strong><p>Count does not establish designation, MFA or separation of duties.</p></WorkspaceCard>
   <WorkspaceCard title="Open staff invitations" description="Unexpired, recorded invitations awaiting activation." href="/admin/staff/invites" action="Review invitations"><strong className="staff-metric">{pendingInvitations}</strong></WorkspaceCard>
   <WorkspaceCard title="Active Field Agent state scopes" description="Scope assignments, not completed field-task authorizations." href="/admin/staff" action="Review Field Agents"><strong className="staff-metric">{activeScopes}</strong></WorkspaceCard>
  </section>
  <section className="staff-access-blueprint" aria-labelledby="access-review-boundaries">
   <div className="staff-access-blueprint-heading"><div><span className="staff-access-blueprint-eyebrow">ACCESS EVIDENCE · LIMITATIONS</span><h2 id="access-review-boundaries">What this review can and cannot verify</h2></div></div>
   <p>This page reads authoritative application account roles, current account status, saved Field Agent state scopes and invitation records. It does not inspect each person's live Supabase session, verified email status, MFA assurance level, individual grants or financial approval credentials.</p>
   <p className="staff-access-blueprint-notice">The required two designated Super Admin identities, mandatory privileged MFA, independent financial authority and user-specific permissions remain unimplemented or unverified. An ACTIVE row is not a certification that the person may perform sensitive actions.</p>
  </section>
  <section className="staff-access-blueprint" aria-labelledby="access-review-directory">
   <div className="staff-access-blueprint-heading"><div><h2 id="access-review-directory">Internal account role and scope inventory</h2><p>Showing recorded roles only. Role-template capability counts are informational and do not override active-status or authentication checks.</p></div><span className="staff-access-blueprint-count">{total} matching records</span></div>
   <form action="/admin/access-review" method="get" className="staff-filter-form">
    <label className="staff-field"><span>Search</span><input name="q" maxLength={80} defaultValue={q} placeholder="Name or email"/></label>
    <label className="staff-field"><span>Role</span><select name="role" defaultValue={role??""}><option value="">All internal roles</option><option value="FIELD_AGENT">Field Agent</option><option value="OPERATIONS">Operations</option><option value="SUPER_ADMIN">Super Admin</option></select></label>
    <label className="staff-field"><span>Status</span><select name="status" defaultValue={status??""}><option value="">All states</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DISABLED">Disabled</option></select></label>
    <button type="submit" className="staff-primary-button">Apply filters</button>
   </form>
   {rows.length?<WorkspaceTable caption="Privileged account and field scope review" columns={["Staff account","Stored role","Account status","Fixed template capabilities","Active state scopes","Review"]}>
     {rows.map(item=><tr key={item.id}>
      <td><strong>{item.fullName}</strong></td>
      <td>{item.role.replaceAll("_"," ")}</td>
      <td><StatusPill status={item.status}/></td>
      <td>{item.status==="ACTIVE"?<><strong>{permissionsForRole(item.role).length}</strong><span className="staff-cell-subtitle">Static role capabilities; provider assurance not checked</span></>:<span className="staff-cell-subtitle">Blocked by recorded account state</span>}</td>
      <td>{item.role==="FIELD_AGENT"?(item.fieldAgentAssignments.length?item.fieldAgentAssignments.map(x=>x.state).join(", "):"No active state scopes"):"Not applicable"}</td>
      <td><Link className="staff-table-link" href={isStaffRole(item.role)?"/admin/staff/"+item.id:"/admin"}>{isStaffRole(item.role)?"View staff record":"Administration"}</Link></td>
     </tr>)}
   </WorkspaceTable>:<WorkspaceEmpty title="No internal accounts match the filters" description="Try a different role, status or name to review existing records."/>}
   <div className="staff-pagination"><span>Page {page} · {total} matching accounts</span>{page>1&&<Link className="staff-secondary-button" href={link(page-1)}>Previous</Link>}{page*pageSize<total&&<Link className="staff-secondary-button" href={link(page+1)}>Next</Link>}</div>
  </section>
 </DashboardFrame>;
}
