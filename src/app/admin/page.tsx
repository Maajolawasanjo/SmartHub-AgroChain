import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceCard} from "@/components/dashboard/dashboard-ui";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {getPrisma} from "@/server/db/prisma";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function AdminHome(){
  const ctx=await requireSuperAdminPage();const db=getPrisma();
  const [staffCount,pendingInvites,suspendedCount]=await Promise.all([
    db.account.count({where:{role:{in:["FIELD_AGENT","OPERATIONS"]}}}),
    db.staffInvitation.count({where:{status:"PENDING",expiresAt:{gt:new Date()}}}),
    db.account.count({where:{role:{in:["FIELD_AGENT","OPERATIONS"]},status:"SUSPENDED"}}),
  ]);
  return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Platform Administration" description="Manage staff access, review fixed permissions and inspect governance activity.">
    <div className="staff-dashboard-grid"><WorkspaceCard title="Staff directory" description="Review Field Agent and Operations accounts."><strong className="staff-metric">{staffCount}</strong><p>{suspendedCount} suspended</p><Link className="staff-text-link" href="/admin/staff">Open directory →</Link></WorkspaceCard>
      <WorkspaceCard title="Pending invitations" description="Track outstanding staff invitations."><strong className="staff-metric">{pendingInvites}</strong><Link className="staff-text-link" href="/admin/staff/invites">Review invitations →</Link></WorkspaceCard>
      <WorkspaceCard title="Role permissions" description="Inspect the fixed permission templates used by the platform."><Link className="staff-text-link" href="/admin/permissions">View permission matrix →</Link></WorkspaceCard>
      <WorkspaceCard title="Staff audit" description="Review recorded staff role, status and assignment changes."><Link className="staff-text-link" href="/admin/audit">Open audit history →</Link></WorkspaceCard></div>
  </DashboardFrame>;
}
