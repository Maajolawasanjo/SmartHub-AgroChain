import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {PERMISSION_DETAILS,hasPermission} from "@/server/admin/permissions";
import {getPrisma} from "@/server/db/prisma";
export const metadata={robots:{index:false,follow:false}};
const roles=["BUYER","FARMER","FIELD_AGENT","OPERATIONS","SUPER_ADMIN"] as const;
export default async function RolePermissions(){const ctx=await requireSuperAdminPage();const db=getPrisma();const counts=await Promise.all(roles.map(role=>db.account.count({where:{role}})));return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Roles & permissions" description="The platform uses fixed role templates; custom per-user permission grants are intentionally unavailable. Operational endpoints use server-side role/permission checks. Field-work endpoints must additionally filter by the active Field Agent state scopes before they ship.">
  <div className="staff-page-links"><Link href="/admin/staff">← Staff directory</Link><Link href="/admin/audit">View staff audit →</Link></div>
  <div className="staff-warning"><strong>Authorization rule</strong><p>Permissions are resolved from the trusted account role on the server, never from editable profile metadata or a browser-selected role. Field Agent access must also be constrained by active assignment scopes in each field-work endpoint.</p></div>
  <div className="staff-table-wrap"><table className="staff-permission-table"><caption className="sr-only">Fixed role permission matrix</caption><thead><tr><th scope="col">Capability</th>{roles.map((role,i)=><th scope="col" key={role}>{role.replaceAll("_"," ")}<span className="staff-cell-subtitle">{counts[i]} accounts</span></th>)}</tr></thead><tbody>{PERMISSION_DETAILS.map(row=><tr key={row.permission}><th scope="row"><strong>{row.label}</strong><span className="staff-cell-subtitle">{row.description}</span></th>{roles.map(role=><td key={role}><span className={hasPermission(role,row.permission)?"staff-permission-yes":"staff-permission-no"} aria-label={hasPermission(role,row.permission)?"Allowed":"Not allowed"}>{hasPermission(role,row.permission)?"Allowed":"—"}</span></td>)}</tr>)}</tbody></table></div>
  <p className="staff-meta-line">The directory can assign Field Agent or Operations templates only. Buyer, Farmer and Super Admin roles cannot be granted through staff invitation or staff role-change screens.</p>
</DashboardFrame>;}
