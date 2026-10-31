import {redirect} from "next/navigation";
import type {ReactNode} from "react";
import {getAccountContext,accountDestination} from "@/server/auth/context";
import {getPrisma} from "@/server/db/prisma";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill,WorkspaceEmpty,WorkspaceUnavailable} from "@/components/dashboard/dashboard-ui";

export async function requirePortal(role:"FARMER"|"OPERATIONS"){
 const ctx=await getAccountContext();
 if(!ctx)redirect("/login");
 const next=accountDestination(ctx);
 if(next==="/verify-email"||next==="/verify-phone"||next==="/account/status")redirect(next);
 if(role==="FARMER"?ctx.account.role!=="FARMER":!["OPERATIONS","SUPER_ADMIN"].includes(ctx.account.role))redirect("/forbidden");
 return {...ctx,db:getPrisma()};
}
export function PortalFrame({role,name,route:_route,title,subtitle,children}:{role:"FARMER"|"OPERATIONS";name:string;route:string;title:string;subtitle?:string;children:ReactNode}){
 return <DashboardFrame role={role} name={name} title={title} description={subtitle}>{children}</DashboardFrame>;
}
export const StateTag=StatusPill;
export function EmptyState({title,body,action,href}:{title:string;body:string;action?:string;href?:string}){
 return <WorkspaceEmpty title={title} description={body} action={action} href={href}/>;
}
export function FeatureNotReady({name}:{name:string}){
 return <WorkspaceUnavailable title={name} home="/farmer"/>;
}
