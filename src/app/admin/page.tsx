import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceCard} from "@/components/dashboard/dashboard-ui";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {getPrisma} from "@/server/db/prisma";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function AdminHome(){
  const ctx=await requireSuperAdminPage();const db=getPrisma();
  const [staffCount,pendingInvites,suspendedCount,openIncidents,paymentReviews,deliveryIssues,openSupport]=await Promise.all([
    db.account.count({where:{role:{in:["FIELD_AGENT","OPERATIONS"]}}}),
    db.staffInvitation.count({where:{status:"PENDING",expiresAt:{gt:new Date()}}}),
    db.account.count({where:{role:{in:["FIELD_AGENT","OPERATIONS"]},status:"SUSPENDED"}}),
    db.governanceIncident.count({where:{status:{not:"CLOSED"}}}),
    db.paymentObligation.count({where:{status:"REVIEW_REQUIRED"}}),
    db.deliveryIssue.count({where:{status:{in:["OPEN","UNDER_REVIEW","RESOLUTION_REQUIRED"]}}}),
    db.supportCase.count({where:{status:{in:["OPEN","IN_PROGRESS","AWAITING_CUSTOMER"]}}}),
  ]);
  return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Platform Administration" description="Govern access, review recorded exceptions and inspect operational performance with independently verified financial records.">
    <div className="staff-dashboard-grid"><WorkspaceCard title="Staff directory" description="Review Field Agent and Operations accounts."><strong className="staff-metric">{staffCount}</strong><p>{suspendedCount} suspended</p><Link className="staff-text-link" href="/admin/staff">Open directory →</Link></WorkspaceCard>
      <WorkspaceCard title="Pending invitations" description="Track outstanding staff invitations."><strong className="staff-metric">{pendingInvites}</strong><Link className="staff-text-link" href="/admin/staff/invites">Review invitations →</Link></WorkspaceCard>
      <WorkspaceCard title="Role permissions" description="Inspect the fixed permission templates used by the platform."><Link className="staff-text-link" href="/admin/permissions">View permission matrix →</Link></WorkspaceCard>
      <WorkspaceCard title="Staff audit" description="Review recorded staff role, status and assignment changes."><Link className="staff-text-link" href="/admin/audit">Open audit history →</Link></WorkspaceCard>
      <WorkspaceCard title="Buyer and farmer directory" description="Review organization and verification records without changing customer permissions."><Link className="staff-text-link" href="/admin/users">Review identities →</Link></WorkspaceCard>
      <WorkspaceCard title="Operational reports" description="Real procurement pipeline, physical stock, verified buyer payments and provider-verified supplier transfers."><Link className="staff-text-link" href="/admin/reports">Explore reports →</Link></WorkspaceCard>
      <WorkspaceCard title="Governance incidents" description="Reason-coded investigations and explicit source record links."><strong className="staff-metric">{openIncidents}</strong><Link className="staff-text-link" href="/admin/governance">Open incident register →</Link></WorkspaceCard>
      <WorkspaceCard title="Finance exceptions" description="Buyer payments requiring independent Paystack resolution."><strong className="staff-metric">{paymentReviews}</strong><Link className="staff-text-link" href="/operations/payments?status=REVIEW_REQUIRED">Review exceptions →</Link></WorkspaceCard>
      <WorkspaceCard title="Delivery disputes" description="Unresolved delivery issues that may prevent completion or farmer settlements."><strong className="staff-metric">{deliveryIssues}</strong><Link className="staff-text-link" href="/operations/disputes">Review disputes →</Link></WorkspaceCard>
      <WorkspaceCard title="Support cases" description="Open customer support conversations and pending agent replies."><strong className="staff-metric">{openSupport}</strong><Link className="staff-text-link" href="/support">Open support queue →</Link></WorkspaceCard>
      <WorkspaceCard title="Configuration and release gates" description="Server-owned security and payment launch switches; secrets not displayed."><Link className="staff-text-link" href="/admin/settings">Review controls →</Link></WorkspaceCard></div>
  </DashboardFrame>;
}
