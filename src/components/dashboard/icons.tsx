import type {IconName} from "./navigation";
import type {ReactNode} from "react";
const paths:Record<IconName,ReactNode>={
 grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
 leaf:<><path d="M20 4C9 4 4 9 4 16c0 3 2 4 5 4 7 0 12-5 11-16Z"/><path d="M4 20c3-5 7-8 12-11"/></>,
 box:<><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 10h18M8 3h8"/></>,
 receipt:<><path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3ZM8 8h8M8 12h6"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
 users:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5v1"/></>,
 shield:<><path d="M12 2 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-5"/></>,
 settings:<><circle cx="12" cy="12" r="3"/><path d="m19 12 2-1-2-4-2 1-2-2V3H9v3L7 8 5 7l-2 4 2 1v2l-2 1 2 4 2-1 2 2v2h6v-2l2-2 2 1 2-4-2-1z"/></>,
 bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M10 21h4"/></>,
 map:<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/></>,
 check:<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
 clipboard:<><rect x="5" y="5" width="14" height="17" rx="2"/><path d="M9 5V3h6v2M9 11h6m-6 4h6"/></>,
 search:<><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
 truck:<><path d="M3 6h12v12H3zM15 10h4l3 4v4h-7M6 18a2 2 0 1 0 4 0m7 0a2 2 0 1 0 4 0"/></>,
 wallet:<><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13M15 14h6"/></>,
 chart:<><path d="M3 21h18M5 17V9h4v8m2 0V4h4v13m2 0v-6h4v6"/></>,
 file:<><path d="M6 2h9l5 5v15H6zM15 2v6h5M9 13h8M9 17h8"/></>,
 help:<><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 3-3 2-3 5m0 3v1"/></>,
 user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
 lock:<><rect x="5" y="11" width="14" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
 tag:<><path d="M3 3h10l8 8-10 10-8-8V3Z"/><circle cx="8" cy="8" r="1"/></>,
 calendar:<><rect x="3" y="5" width="18" height="17" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></>,
 mail:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
};
export function WorkspaceIcon({name,size=19}:{name:IconName;size?:number}){return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>}
