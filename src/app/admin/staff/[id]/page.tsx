import Link from "next/link";
import {notFound} from "next/navigation";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill,WorkspaceCard} from "@/components/dashboard/dashboard-ui";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {isStaffRole} from "@/server/admin/permissions";
import {getPrisma} from "@/server/db/prisma";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function StaffDetail({params}:{params:Promise<{id:string}>}){
  const ctx=await requireSuperAdminPage();const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))notFound();
  const staff=await getPrisma().account.findUnique({where:{id},select:{id:true,fullName:true,email:true,phone:true,role:true,status:true,createdAt:true,updatedAt:true,fieldAgentAssignments:{where:{active:true},orderBy:{state:"asc"},select:{state:true}}}});
  if(!staff||!isStaffRole(staff.role))notFound();
  return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title={staff.fullName} description="Staff identity and access controls.">
    <div className="staff-page-links"><Link href="/admin/staff">← Staff directory</Link><Link href={`/admin/staff/${id}/activity`}>View audit activity →</Link></div>
    <section className="staff-profile-card"><div><span className="staff-eyebrow">{staff.role==="FIELD_AGENT"?"Field Agent":"Operations"}</span><h2>{staff.fullName}</h2><p>{staff.email}</p><p>{staff.phone||"Phone not provided"}</p></div><StatusPill status={staff.status}/></section>
    <div className="staff-detail-grid"><WorkspaceCard title="Role & permissions" description="Change only between approved staff role templates." href={`/admin/staff/${id}/roles`} action="Manage role"/><WorkspaceCard title="Account status" description="Suspend or reinstate access with a recorded reason." href={`/admin/staff/${id}/status`} action="Manage status"/><WorkspaceCard title="Field scope" description={staff.role==="FIELD_AGENT"?`${staff.fieldAgentAssignments.length} active state scopes.`:"Only Field Agents receive state scopes."} href={staff.role==="FIELD_AGENT"?`/admin/staff/${id}/assignments`:undefined} action={staff.role==="FIELD_AGENT"?"Manage assignments":undefined}/><WorkspaceCard title="Audit history" description="Review recorded staff identity, access and assignment changes." href={`/admin/staff/${id}/activity`} action="View activity"/></div>
    <p className="staff-meta-line">Account created {staff.createdAt.toLocaleDateString("en-NG")} · Last profile update {staff.updatedAt.toLocaleDateString("en-NG")}</p>
  </DashboardFrame>;
}
