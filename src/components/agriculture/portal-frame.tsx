import Link from "next/link";
import type {ReactNode} from "react";
import { redirect } from "next/navigation";
import { getAccountContext, accountDestination } from "@/server/auth/context";
import { getPrisma } from "@/server/db/prisma";

const farmerNav=[
 ["Dashboard","/farmer"], ["My Supply","/farmer/my-supply"],
 ["Opportunities","/farmer/opportunities"], ["Orders & Transactions","/farmer/orders"],
 ["Payouts & Wallet","/farmer/wallet"], ["Notifications","/farmer/notifications"],
 ["Farm Profile & Verification","/farmer/kyc"], ["Settings","/farmer/settings"],
];
const operationsNav=[
 ["Dashboard","/operations"], ["Farmer verification","/operations/verification"],
 ["Supply review","/operations/supply"], ["Commodity catalog","/operations/catalog"],
 ["My Account","/operations/account"]
];
export async function requirePortal(role:"FARMER"|"OPERATIONS"){
 const ctx=await getAccountContext();
 if(!ctx)redirect("/login");
 const next=accountDestination(ctx);
 if(next==="/verify-email"||next==="/verify-phone"||next==="/account/status")redirect(next);
 if(role==="FARMER"?ctx.account.role!=="FARMER":!["OPERATIONS","SUPER_ADMIN"].includes(ctx.account.role))redirect("/forbidden");
 return {...ctx,db:getPrisma()};
}
export function PortalFrame({role,name,route,title,subtitle,children}:{role:"FARMER"|"OPERATIONS";name:string;route:string;title:string;subtitle?:string;children:ReactNode}){
 const nav=role==="FARMER"?farmerNav:operationsNav;
 return <div className="agro-dashboard">
  <aside className="agro-sidebar"><Link href="/" className="agro-brand">SmartHub <span>AgroChain</span></Link>
   <p className="agro-side-caption">{role==="FARMER"?"FARMER PORTAL":"OPERATIONS"}</p>
   <nav aria-label={`${role==="FARMER"?"Farmer":"Operations"} navigation`} className="agro-side-nav">{nav.map(([label,href])=><Link key={href} href={href} aria-current={route===href||(href!=="/farmer"&&href!=="/operations"&&route.startsWith(href+"/"))?"page":undefined}>{label}</Link>)}</nav>
   <div className="agro-account-link"><Link href="/account/profile">My profile</Link><Link href="/logout">Sign out</Link></div>
  </aside>
  <div className="agro-main"><header className="agro-top"><span>SmartHub AgroChain</span><span className="agro-user">{name}</span></header>
   <main className="agro-content"><header className="agro-page-head"><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</header>{children}</main>
  </div>
 </div>;
}
export function StateTag({status}:{status:string}){return <span className="agro-status">{status.replaceAll("_"," ").toLowerCase()}</span>}
export function EmptyState({title,body,action,href}:{title:string;body:string;action?:string;href?:string}){return <section className="agro-panel agro-empty"><h2>{title}</h2><p>{body}</p>{action&&href&&<Link className="action action-primary" href={href}>{action}</Link>}</section>}
export function FeatureNotReady({name}:{name:string}){return <section className="agro-panel agro-empty"><h2>{name} is not enabled yet</h2><p>This feature will show only real, authorized records once the relevant transaction backend is implemented. No sample opportunities, transactions, balances or notifications are displayed.</p><Link className="action action-outline" href="/farmer">Return to dashboard</Link></section>}
