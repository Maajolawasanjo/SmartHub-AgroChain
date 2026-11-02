import Link from "next/link";
import {redirect} from "next/navigation";
import {getAccountContext,accountDestination,mayAccess} from "@/server/auth/context";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceCard,WorkspaceUnavailable} from "@/components/dashboard/dashboard-ui";
import {workspaceMeta,type WorkspaceRole} from "@/components/dashboard/navigation";

/** Protected foundation for roles whose business workflows are not yet available. */
export async function PortalShell({route,title,description}:{route:string;title:string;description:string}){
 const ctx=await getAccountContext();
 if(!ctx)redirect("/login");
 const destination=accountDestination(ctx);
 if(destination==="/verify-email"||destination==="/verify-phone"||destination==="/account/status")redirect(destination);
 if(!mayAccess(ctx,route))redirect("/forbidden");
 const role=ctx.account.role as WorkspaceRole;
 return <DashboardFrame role={role} name={ctx.account.fullName} title={title} description={description}>
  <div className="workspace-welcome"><span className="workspace-welcome-kicker">Your workspace</span><h2>Welcome, {ctx.account.fullName.split(" ")[0]}</h2><p>Your identity and role are checked on the server. Only authorized, implemented operations are available. Upcoming modules appear as clearly labelled planned navigation.</p><Link href="/account/profile" className="workspace-cta">Review my profile <span aria-hidden="true">→</span></Link></div>
  <div className="workspace-card-grid">
   <WorkspaceCard title="Account profile" description="Review and update permitted identity details." href="/account/profile" action="Open profile"/>
   <WorkspaceCard title="Security & access" description="Manage password and verified contact methods." href="/account/security/password" action="Change password"/>
   <WorkspaceCard title="Help & support" description="Get support with access or platform questions." href="/contact" action="Get support"/>
   {role==="SUPER_ADMIN"&&<WorkspaceCard title="Staff invitations" description="Invite authorized Field Agents and Operations staff." href="/admin/staff/invite" action="Invite staff"/>}
  </div>
  <WorkspaceUnavailable title={workspaceMeta[role].title+" business modules"} description="Your role-specific transaction modules are scheduled for later implementation phases. No farmer, buyer, payment or assignment records are being simulated." home={workspaceMeta[role].home}/>
 </DashboardFrame>;
}
