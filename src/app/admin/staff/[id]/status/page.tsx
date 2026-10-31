import Link from "next/link";
import {notFound} from "next/navigation";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill} from "@/components/dashboard/dashboard-ui";
import {StaffAuthSyncForm,StaffStatusForm} from "@/features/admin/staff/staff-forms";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {isStaffRole} from "@/server/admin/permissions";
import {getPrisma} from "@/server/db/prisma";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function StaffStatusPage({params}:{params:Promise<{id:string}>}){const ctx=await requireSuperAdminPage();const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))notFound();const staff=await getPrisma().account.findUnique({where:{id},select:{id:true,fullName:true,role:true,status:true}});if(!staff||!isStaffRole(staff.role))notFound();return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Account status" description={`Access status for ${staff.fullName}.`}><div className="staff-page-narrow"><div className="staff-page-links"><Link href={`/admin/staff/${id}`}>← Staff profile</Link><span>Current status: <StatusPill status={staff.status}/></span></div><StaffStatusForm staffId={id} currentStatus={staff.status}/>{staff.status!=="DISABLED"&&<div className="staff-sync-section"><StaffAuthSyncForm staffId={id}/></div>}</div></DashboardFrame>;}
