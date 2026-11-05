import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceTable} from "@/components/dashboard/dashboard-ui";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {getPrisma} from "@/server/db/prisma";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function DirectoryDetail({params}:{params:Promise<{id:string}>}){
 const ctx=await requireSuperAdminPage(),{id}=await params;
 if(!z.uuid().safeParse(id).success)notFound();
 const db=getPrisma();
 const [account,audits,supportCount]=await Promise.all([
  db.account.findUnique({where:{id},select:{
   id:true,fullName:true,email:true,phone:true,role:true,status:true,createdAt:true,updatedAt:true,
   state:true,farmName:true,farmerVerification:{select:{status:true,submittedAt:true,reviewedAt:true}},
   buyerMembership:{select:{role:true,joinedAt:true,organization:{select:{
    id:true,businessName:true,verificationStatus:true,createdAt:true
   }}}}
  }}),
  db.auditEvent.findMany({where:{OR:[{actorId:id},{subjectId:id}]},orderBy:{createdAt:"desc"},take:25,
   select:{id:true,action:true,createdAt:true,actor:{select:{fullName:true}}}}),
  db.supportCase.count({where:{openedById:id}})
 ]);
 if(!account||!["BUYER","FARMER"].includes(account.role))notFound();
 return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Account Governance Review" description="Restricted account details and recorded audit history; no permission or payment override actions.">
 <div className="staff-page-links"><Link href="/admin/users">← Farmer & buyer directory</Link><Link href="/admin/governance">Incident register</Link><Link href="/admin/audit">Audit history</Link></div>
 <section className="agro-panel"><h2>{account.fullName}</h2><p>Account ID: <code>{account.id}</code></p>
 <p>Role: <strong>{account.role}</strong> · Status: <strong>{account.status}</strong></p><p>Confirmed account email on record: {account.email}</p>
 <p>Contact phone on record: {account.phone}</p><p>Created: {account.createdAt.toLocaleString("en-NG")} · Last profile update: {account.updatedAt.toLocaleString("en-NG")}</p>
 {account.role==="FARMER"?<><p>Farm: {account.farmName??"Not recorded"} · State: {account.state??"Not recorded"}</p>
 <p>Independent verification: {account.farmerVerification?.status??"NOT_STARTED"} · Reviewed: {account.farmerVerification?.reviewedAt?.toLocaleDateString("en-NG")??"Not reviewed"}</p></>:
 <><p>Buyer organization: {account.buyerMembership?.organization.businessName??"Not configured"}</p>
 <p>Membership: {account.buyerMembership?.role??"Not configured"} · Independent verification: {account.buyerMembership?.organization.verificationStatus??"NOT_REQUESTED"}</p></>}
 <p>Support cases opened: {supportCount}</p>
 </section>
 <section className="agro-panel"><h2>Recent related audit trail (latest 25)</h2>
 <WorkspaceTable caption="Related account actions" columns={["Recorded action","Actor","Timestamp"]}>
 <>{audits.map(ev=><tr key={ev.id}><td>{ev.action.replaceAll("_"," ")}</td><td>{ev.actor.fullName}</td><td>{ev.createdAt.toLocaleString("en-NG")}</td></tr>)}</></WorkspaceTable>
 {!audits.length&&<p>No recorded related events yet.</p>}
 </section>
 <div className="agro-alert">This page is read-only. Buyer verification, farmer verification, and identity security must remain in their separately authorized workflows. Do not use admin reporting pages to bypass external provider checks.</div>
 </DashboardFrame>;
}
