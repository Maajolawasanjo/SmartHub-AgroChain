import type {ReactNode} from "react";
import {DashboardChrome} from "./dashboard-chrome";
import type {WorkspaceRole} from "./navigation";
/** Visual shell only. Caller must authenticate and authorize the role server-side. */
export function DashboardFrame({role,name,title,description,children}:{role:WorkspaceRole;name:string;title:string;description?:string;children:ReactNode}){
 return <DashboardChrome role={role} displayName={name} title={title} description={description}>{children}</DashboardChrome>;
}
