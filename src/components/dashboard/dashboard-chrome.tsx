"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {accountNavigation,matchesWorkspacePath,workspaceMeta,workspaceNavigation,type NavigationItem,type WorkspaceRole} from "./navigation";
import {WorkspaceIcon} from "./icons";

type Props={role:WorkspaceRole;displayName:string;title:string;description?:string;children:ReactNode};

function NavigationEntry({item,path,onNavigate}:{item:NavigationItem;path:string;onNavigate:()=>void}){
 const content=<><WorkspaceIcon name={item.icon}/><span className="workspace-nav-label">{item.label}</span></>;
 if(item.availability==="planned")return <span className="workspace-nav-item workspace-nav-item--planned" aria-disabled="true" title={`${item.label} — coming in a later phase`}>{content}<span className="workspace-nav-soon">Soon</span></span>;
 const active=matchesWorkspacePath(path,item.href);
 return <Link href={item.href} className={`workspace-nav-item${active?" is-active":""}`} aria-current={active?"page":undefined} onClick={onNavigate}>{content}{active&&<span className="workspace-nav-current" aria-hidden="true"/>}</Link>;
}
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(x=>x.charAt(0)).join("").toUpperCase()||"SH"}

export function DashboardChrome({role,displayName,title,description,children}:Props){
 const menuButton=useRef<HTMLButtonElement>(null);
 const sidebar=useRef<HTMLElement>(null);
 const profilePanel=useRef<HTMLDivElement>(null);
 const closeMenu=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false);
 const [profileOpen,setProfileOpen]=useState(false);
 const path=usePathname()||workspaceMeta[role].home;
 const meta=workspaceMeta[role];
 useEffect(()=>{setOpen(false);setProfileOpen(false)},[path]);
 useEffect(()=>{if(!open && !profileOpen)return;const handler=(event:KeyboardEvent)=>{
  if(event.key==="Escape"){
   if(open){setOpen(false);menuButton.current?.focus();}
   setProfileOpen(false);
  }
  if(event.key==="Tab" && open && sidebar.current){
   const focusable=Array.from(sidebar.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')).filter(el=>el.getClientRects().length>0);
   const first=focusable[0],last=focusable.at(-1);
   if(!first||!last)return;
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 };window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)},[open,profileOpen]);
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";closeMenu.current?.focus();return()=>{document.body.style.overflow=previous;}},[open]);
 useEffect(()=>{if(!profileOpen)return;const onPointer=(event:PointerEvent)=>{if(profilePanel.current && !profilePanel.current.contains(event.target as Node))setProfileOpen(false)};document.addEventListener("pointerdown",onPointer);return()=>document.removeEventListener("pointerdown",onPointer)},[profileOpen]);
 const navigate=()=>{setOpen(false);setProfileOpen(false)};
 const sections=[...workspaceNavigation[role],accountNavigation];
 return <div className="workspace-layout">
  <a className="workspace-skip" href="#main-workspace">Skip to main content</a>
  {open&&<button type="button" className="workspace-overlay" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
  <aside ref={sidebar} id="workspace-sidebar" role={open?"dialog":undefined} aria-modal={open?true:undefined} className={`workspace-sidebar${open?" is-open":""}`} aria-label="Workspace sidebar">
   <div className="workspace-sidebar-brand"><Link href="/" onClick={navigate} className="workspace-brand-mark" aria-label="SmartHub AgroChain home"><span className="workspace-brand-symbol"><WorkspaceIcon name="leaf" size={23}/></span><span>SmartHub<span className="workspace-brand-accent"> AgroChain</span><small>Where agriculture meets innovation</small></span></Link><button ref={closeMenu} type="button" className="workspace-close" aria-label="Close menu" onClick={()=>setOpen(false)}>×</button></div>
   <div className="workspace-role-summary"><span className="workspace-role-marker"/><div><strong>{meta.title}</strong><span>{meta.description}</span></div></div>
   <nav className="workspace-menu" aria-label="Workspace navigation">{sections.map(section=><div className="workspace-menu-section" key={section.title}><h2>{section.title}</h2><div className="workspace-menu-links">{section.items.map(item=><NavigationEntry key={item.href} item={item} path={path} onNavigate={navigate}/>)}</div></div>)}</nav>
   <div className="workspace-sidebar-footer"><Link href="/logout" onClick={navigate} className="workspace-signout"><WorkspaceIcon name="lock" size={17}/>Sign out</Link><span>SmartHub AgroChain · Secure workspace</span></div>
  </aside>
  <div className="workspace-main">
   <header className="workspace-topbar">
    <div className="workspace-topbar-left"><button ref={menuButton} type="button" className="workspace-mobile-menu" aria-controls="workspace-sidebar" aria-expanded={open} onClick={()=>setOpen(v=>!v)} aria-label="Open navigation"><span/><span/><span/></button><div className="workspace-topbar-identity"><span>SmartHub AgroChain</span><strong>{meta.title}</strong></div></div>
    <div className="workspace-topbar-right">{role==="BUYER"&&<Link className="workspace-topbar-help" href="/dashboard/notifications" aria-label="Buyer notifications"><WorkspaceIcon name="bell" size={17}/> Notifications</Link>}<Link className="workspace-topbar-help" href="/contact"><WorkspaceIcon name="help" size={17}/> Help</Link><div ref={profilePanel} className="workspace-profile"><button className="workspace-profile-trigger" type="button" aria-expanded={profileOpen} aria-haspopup="menu" onClick={()=>setProfileOpen(v=>!v)}><span className="workspace-avatar" aria-hidden="true">{initials(displayName)}</span><span className="workspace-profile-name">{displayName}</span><span className="workspace-chevron" aria-hidden="true">⌄</span></button>{profileOpen&&<div className="workspace-profile-menu" role="menu"><span className="workspace-profile-caption">Signed in as {displayName}</span><Link role="menuitem" onClick={navigate} href="/account/profile">My profile</Link><Link role="menuitem" onClick={navigate} href="/account/security/password">Change password</Link><Link role="menuitem" onClick={navigate} href="/contact">Help & support</Link><Link role="menuitem" className="workspace-profile-signout" onClick={navigate} href="/logout">Sign out</Link></div>}</div></div>
   </header>
   <main id="main-workspace" tabIndex={-1} className="workspace-content">
    <nav className="workspace-breadcrumb" aria-label="Breadcrumb"><Link href={meta.home}>{meta.title}</Link>{path!==meta.home&&<><span aria-hidden="true">/</span><span aria-current="page">{title}</span></>}</nav>
    <header className="workspace-page-heading"><div><div className="workspace-eyebrow"><span className="workspace-eyebrow-dot"/> {role.replaceAll("_"," ")} · SmartHub AgroChain</div><h1>{title}</h1>{description&&<p>{description}</p>}</div></header>
    {children}
   </main>
   <footer className="workspace-footer"><span>© {new Date().getFullYear()} SmartHub AgroChain</span><Link href="/privacy">Privacy</Link><Link href="/contact">Contact</Link></footer>
  </div>
 </div>;
}
