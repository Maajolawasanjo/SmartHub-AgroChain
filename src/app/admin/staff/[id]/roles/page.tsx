import Link from "next/link";
import {notFound} from "next/navigation";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StaffRoleForm} from "@/features/admin/staff/staff-forms";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {isStaffRole} from "@/server/admin/permissions";
import {getPrisma} from "@/server/db/prisma";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function StaffRolePage({params}:{params:Promise<{id:string}>}){const ctx=await requireSuperAdminPage();const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))notFound();const staff=await getPrisma().account.findUnique({where:{id},select:{id:true,fullName:true,role:true,status:true}});if(!staff||!isStaffRole(staff.role))notFound();return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Role & permissions" description={`Manage the fixed access template for ${staff.fullName}.`}><div className="staff-page-narrow"><div className="staff-page-links"><Link href={`/admin/staff/${id}`}>← Staff profile</Link><Link href="/admin/permissions">View all role templates →</Link></div>{staff.status==="ACTIVE"?<StaffRoleForm staffId={id} currentRole={staff.role}/>:<div className="staff-warning"><strong>Role changes locked</strong><p>Reinstate this staff account before changing its role.</p><Link href={`/admin/staff/${id}/status`}>Review account status →</Link></div>}</div></DashboardFrame>;}
