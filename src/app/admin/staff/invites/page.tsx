import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill,WorkspaceEmpty,WorkspaceTable} from "@/components/dashboard/dashboard-ui";
import {InvitationRevokeForm} from "@/features/admin/staff/staff-forms";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {getPrisma} from "@/server/db/prisma";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function StaffInvitations({searchParams}:{searchParams:Promise<{status?:string;page?:string}>}){
  const ctx=await requireSuperAdminPage();const params=await searchParams;const now=new Date();const page=Math.min(Math.max(Number.parseInt(params.page??"1",10)||1,1),500);const pageSize=25;
  const selected=["PENDING","ACCEPTED","REVOKED","EXPIRED","DELIVERY_FAILED","DELIVERY_UNCERTAIN"].includes(params.status??"")?params.status:undefined;
  const where=selected==="EXPIRED"?{status:"PENDING" as const,expiresAt:{lte:now}}:selected==="PENDING"?{status:"PENDING" as const,expiresAt:{gt:now}}:selected?{status:selected as "ACCEPTED"|"REVOKED"|"DELIVERY_FAILED"|"DELIVERY_UNCERTAIN"}:{ };
  const db=getPrisma();const [items,total]=await Promise.all([db.staffInvitation.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*pageSize,take:pageSize,select:{id:true,email:true,role:true,status:true,expiresAt:true,createdAt:true,acceptedAt:true,invitedBy:{select:{fullName:true}}}}),db.staffInvitation.count({where})]);
  return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Staff invitations" description="Review pending, accepted, revoked and expired staff invitations.">
    <div className="staff-page-links"><Link href="/admin/staff">← Staff directory</Link><Link className="staff-primary-button" href="/admin/staff/invite">Invite staff</Link></div>
    <nav className="staff-filter-tabs" aria-label="Invitation status">{[["","All"],["PENDING","Pending"],["ACCEPTED","Accepted"],["REVOKED","Revoked"],["EXPIRED","Expired"],["DELIVERY_FAILED","Delivery failed"],["DELIVERY_UNCERTAIN","Delivery uncertain"]].map(([value,label])=><Link key={value} className={selected===value?"is-current":""} href={value?`/admin/staff/invites?status=${value}`:"/admin/staff/invites"}>{label}</Link>)}</nav>
    {items.length?<WorkspaceTable caption="Staff invitations" columns={["Invitee","Role","Status","Sent","Expires","Invited by","Action"]}><>{items.map(item=>{const effective=item.status==="PENDING"&&item.expiresAt<=now?"EXPIRED":item.status;return <tr key={item.id}><td>{item.email}</td><td>{item.role==="FIELD_AGENT"?"Field Agent":"Operations"}</td><td><StatusPill status={effective}/></td><td>{item.createdAt.toLocaleDateString("en-NG")}</td><td>{item.expiresAt.toLocaleDateString("en-NG")}</td><td>{item.invitedBy.fullName}</td><td>{effective==="PENDING"?<InvitationRevokeForm invitationId={item.id}/>:<span className="staff-muted">No action</span>}</td></tr>;})}</></WorkspaceTable>:<WorkspaceEmpty title="No invitations in this view" description="Invitations appear here after a Super Admin sends a staff invite." href="/admin/staff/invite" action="Invite staff"/>}
    <div className="staff-pagination"><span>{total} invitations · Page {page}</span>{page>1&&<Link className="staff-secondary-button" href={`/admin/staff/invites?${new URLSearchParams({status:selected??"",page:String(page-1)})}`}>Previous</Link>}{page*pageSize<total&&<Link className="staff-secondary-button" href={`/admin/staff/invites?${new URLSearchParams({status:selected??"",page:String(page+1)})}`}>Next</Link>}</div>
  </DashboardFrame>;
}
