import type {ReactNode} from "react";
import Link from "next/link";
import { WorkspaceIcon } from "./icons";

export function WorkspaceCard({title,description,children,href,action}:{title:string;description?:string;children?:ReactNode;href?:string;action?:string}){
 return <section className="workspace-card"><div className="workspace-card-head"><h2>{title}</h2>{description&&<p>{description}</p>}</div>{children}{href&&action&&<Link className="workspace-card-action" href={href}>{action}<span aria-hidden="true">→</span></Link>}</section>;
}
const statusTone:Record<string,"positive"|"warning"|"negative"|"neutral">={
 VERIFIED:"positive",APPROVED:"positive",ACTIVE:"positive",COMPLETED:"positive",ACCEPTED:"positive",REVIEWED:"positive",PAID:"positive",DELIVERED:"positive",
 PENDING_REVIEW:"warning",UNDER_REVIEW:"warning",SOURCING_IN_PROGRESS:"warning",PENDING_VERIFICATION:"warning",MORE_INFO_REQUIRED:"warning",PENDING:"warning",SUBMITTED:"warning",RETURNED:"warning",DRAFT:"neutral",PROFILE_INCOMPLETE:"warning",IN_PROGRESS:"warning",
 REJECTED:"negative",DISABLED:"negative",SUSPENDED:"negative",FAILED:"negative",EXPIRED:"negative",CANCELLED:"neutral",CLOSED:"neutral",WITHDRAWN:"neutral",
};
export function StatusPill({status}:{status:string}){
 const normalized=status.toUpperCase().trim().replaceAll(/\s+/g,"_");
 const tone=statusTone[normalized]??"neutral";
 return <span className={`workspace-status workspace-status--${tone}`}><span className="workspace-status-dot" aria-hidden="true"/>{status.replaceAll("_"," ").toLowerCase()}</span>;
}
export function WorkspaceEmpty({title,description,href,action}:{title:string;description:string;href?:string;action?:string}){
 return <section className="workspace-empty"><span className="workspace-empty-symbol"><WorkspaceIcon name="clipboard" size={24}/></span><h2>{title}</h2><p>{description}</p>{href&&action&&<Link className="workspace-cta" href={href}>{action}</Link>}</section>;
}
export function WorkspaceUnavailable({title,description,home}:{title:string;description?:string;home:string}){
 return <WorkspaceEmpty title={`${title} is not available yet`} description={description??"This section will display only verified, authorized business records after its service is implemented. No example balances or invented transactions are shown."} href={home} action="Back to my overview"/>;
}
export function WorkspaceLoading(){return <div role="status" aria-label="Loading workspace" className="workspace-skeleton-container"><div className="workspace-skeleton workspace-skeleton-heading"/><div className="workspace-skeleton-grid">{[1,2,3].map(i=><div key={i} className="workspace-skeleton workspace-skeleton-card"/>)}</div><div className="workspace-skeleton workspace-skeleton-panel"/><span className="sr-only">Loading workspace information…</span></div>}
export function WorkspaceTable({caption,columns,children}:{caption:string;columns:string[];children:ReactNode}){
 return <div className="workspace-table-scroll" tabIndex={0} role="region" aria-label={`${caption}, scroll horizontally if needed`}><table className="workspace-table"><caption className="sr-only">{caption}</caption><thead><tr>{columns.map(c=><th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
