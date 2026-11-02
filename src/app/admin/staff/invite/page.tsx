import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StaffInviteForm} from "@/features/admin/staff/staff-forms";
import {requireSuperAdminPage} from "@/server/admin/guard";
export const metadata={robots:{index:false,follow:false}};
export default async function InviteStaff(){const ctx=await requireSuperAdminPage();return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Invite staff" description="Create a time-limited invitation for an approved staff role."><div className="staff-page-narrow"><div className="staff-page-links"><Link href="/admin/staff">← Staff directory</Link><Link href="/admin/staff/invites">View invitations →</Link></div><StaffInviteForm/></div></DashboardFrame>;}
