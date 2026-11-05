import Link from "next/link";
import {Prisma} from "@/generated/prisma/client";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceTable,WorkspaceEmpty} from "@/components/dashboard/dashboard-ui";
import {requireSuperAdminPage} from "@/server/admin/guard";
import {getPrisma} from "@/server/db/prisma";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function Directory({searchParams}:{searchParams:Promise<{q?:string;role?:string;status?:string;page?:string}>}){
 const ctx=await requireSuperAdminPage(),db=getPrisma(),search=await searchParams;
 const role=search.role==="BUYER"||search.role==="FARMER"?search.role:null;
 const status=["ACTIVE","SUSPENDED","DISABLED"].includes(search.status??"")?search.status as "ACTIVE"|"SUSPENDED"|"DISABLED":null;
 const q=(search.q??"").trim().slice(0,70);
 const page=Math.min(500,Math.max(1,Number.parseInt(search.page??"1",10)||1));
 const where:Prisma.AccountWhereInput={
  role:role??{in:["BUYER","FARMER"]},
  ...(status?{status}:{}),
  ...(q?{OR:[{fullName:{contains:q,mode:"insensitive"}},{email:{contains:q,mode:"insensitive"}}]}:{})
 };
 const [items,total]=await Promise.all([
  db.account.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*25,take:25,
   select:{id:true,fullName:true,email:true,role:true,status:true,createdAt:true,
    farmerVerification:{select:{status:true}},
    buyerMembership:{select:{role:true,organization:{select:{businessName:true,verificationStatus:true}}}}}}),
  db.account.count({where})
 ]);
 const link=(p:number)=>"/admin/users?"+new URLSearchParams({...q?{q}:{},...role?{role}:{},...status?{status}:{},page:String(p)});
 return <DashboardFrame role="SUPER_ADMIN" name={ctx.account.fullName} title="Buyer & Farmer Directory" description="Restricted, read-only identity and verification oversight. Changing user roles or financial status is not available from this directory.">
 <div className="staff-page-links"><Link href="/admin">← Administration</Link><Link href="/admin/staff">Staff directory</Link><Link href="/admin/reports">Reporting</Link></div>
 <form className="agro-toolbar" action="/admin/users" method="get">
 <input name="q" maxLength={70} defaultValue={q} placeholder="Search name or verified account email" aria-label="Search identities"/>
 <select name="role" defaultValue={role??""} aria-label="Filter account role"><option value="">Buyers and farmers</option><option value="BUYER">Buyers</option><option value="FARMER">Farmers</option></select>
 <select name="status" defaultValue={status??""} aria-label="Filter account status"><option value="">All account statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DISABLED">Disabled</option></select>
 <button className="action action-primary" type="submit">Filter</button></form>
 <section className="agro-panel"><h2>{total} matching accounts</h2>
 {items.length?<WorkspaceTable caption="Verified account identities and current business verification" columns={["Account","Role","Access","Verification","Created","Detail"]}>
 <>{items.map(a=><tr key={a.id}><td><strong>{a.fullName}</strong><span className="staff-cell-subtitle">{a.email}</span></td>
 <td>{a.role.replaceAll("_"," ")}</td><td>{a.status}</td><td>{a.role==="FARMER"?a.farmerVerification?.status??"NOT_STARTED":
 a.buyerMembership?.organization.verificationStatus??"NOT_REQUESTED"}</td>
 <td>{a.createdAt.toLocaleDateString("en-NG")}</td><td><Link href={"/admin/users/"+a.id}>Review</Link></td></tr>)}</></WorkspaceTable>:
 <WorkspaceEmpty title="No matching records" description="No accounts match the supplied filters. Only actual Supabase-provisioned identities are shown."/>}
 <nav className="agro-toolbar" aria-label="Directory pagination"><span>Page {page} of {Math.max(1,Math.ceil(total/25))}</span>{page>1&&<Link href={link(page-1)}>Previous</Link>}{page*25<total&&<Link href={link(page+1)}>Next</Link>}</nav></section>
 <p className="agro-hint">Account roles and verification outcomes are managed by their established, separately authorized workflows. This directory cannot invite staff, elevate roles, verify buyers or trigger payouts.</p>
 </DashboardFrame>;
}
