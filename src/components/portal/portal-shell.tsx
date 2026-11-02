import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountContext,accountDestination,mayAccess } from "@/server/auth/context";

export async function PortalShell({route,title,description}:{route:string;title:string;description:string}){
 const ctx=await getAccountContext();
 if(!ctx)redirect("/login");
 const destination=accountDestination(ctx);
 if(destination!==route&&!mayAccess(ctx,route))redirect(destination==="/account/status"?"/account/status":"/forbidden");
 if(destination==="/verify-email"||destination==="/verify-phone"||destination==="/account/status")redirect(destination);
 return <main className="container min-h-screen py-16">
  <Link href="/" className="text-sm font-bold text-[#123d2b]">SmartHub AgroChain</Link>
  <section className="surface mt-8 max-w-3xl p-8">
   <p className="eyebrow">Protected portal</p><h1 className="mt-3 text-4xl font-bold">{title}</h1>
   <p className="mt-5 text-[#526858]">Welcome, {ctx.account.fullName}. {description}</p>
   <p className="mt-4 text-sm text-[#526858]">Account role: {ctx.account.role.replaceAll("_"," ")}. This foundation does not display fabricated operations or transaction data.</p>
   <nav aria-label="Account navigation" className="mt-8 flex flex-wrap gap-3">
    <Link className="action action-outline" href="/account/profile">My profile</Link>
    <Link className="action action-outline" href="/account/security">Security</Link>
    <Link className="action action-outline" href="/account/preferences">Preferences</Link>
    <Link className="action action-outline" href="/logout">Sign out</Link>
    {ctx.account.role==="SUPER_ADMIN"&&<Link className="action action-outline" href="/admin/staff/invite">Invite staff</Link>}
   </nav>
  </section>
 </main>;
}
