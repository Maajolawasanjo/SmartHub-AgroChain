"use client";
import { useState } from "react";
import { ActionNotice } from "./auth-ui";

type ActionProps={route:string;action:string;stateId:string};

export function GenericAction({route,action,stateId}:ActionProps){
  const [feedback,setFeedback]=useState(false);
  const [query,setQuery]=useState("");
  const [reason,setReason]=useState("");
  if (["/signup","/login","/forgot-password","/reset-password","/account/security/password","/verify-phone","/account/security/phone","/account/security/email","/admin/staff/invite","/admin/staff/new","/account/profile","/operations/account","/field-agent/account","/admin/account","/account/delete","/account/delete/confirm","/account/preferences","/invite/accept","/invite/profile"].includes(route)) return null;
  const staffSearch=route==="/admin/staff";
  const staffRoles=route.endsWith("/[id]/roles");
  const staffStatus=route.endsWith("/[id]/status");
  const staffAssignments=route.endsWith("/[id]/assignments");
  const helpForm=route==="/account/help";
  return <div className="auth-generic-action">
    {staffSearch&&<><label className="auth-label" htmlFor="staff-search">Find a staff member</label><input className="auth-input" id="staff-search" type="search" placeholder="Search by name or staff ID" value={query} onChange={e=>setQuery(e.target.value)}/><p className="auth-hint">The staff directory cannot show or search real accounts before authorized backend access is configured.</p></>}
    {staffRoles&&<><label className="auth-label" htmlFor="staff-permission">Proposed role change</label><select id="staff-permission" value={query} onChange={e=>setQuery(e.target.value)} className="auth-input"><option value="">Choose a role</option><option value="FIELD_AGENT">Field Agent</option><option value="OPERATIONS">Operations</option></select><p className="auth-hint">Super Admin approval, privilege separation and audit recording are required before any role change.</p></>}
    {staffAssignments&&<><label className="auth-label" htmlFor="staff-region-change">Region or assignment</label><input id="staff-region-change" className="auth-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Enter an approved assignment"/><p className="auth-hint">Only permitted staff assignments may be changed.</p></>}
    {staffStatus&&<><label className="auth-label" htmlFor="staff-status-reason">Reason for account status change</label><textarea className="auth-input auth-textarea" id="staff-status-reason" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain the requested decision"/><p className="auth-hint">Suspension and reactivation require authorization and an immutable audit record.</p></>}
    {helpForm&&<><label className="auth-label" htmlFor="help-request">Describe the account access issue</label><textarea className="auth-input auth-textarea" id="help-request" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Don't include passwords, verification codes, or recovery links"/></>}
    {route==="/account/sessions"&&<ActionNotice kind="info">No device sessions can be listed until the current authenticated user is securely identified. This is not a claim that no sessions exist.</ActionNotice>}
    {route==="/admin/staff/invites"&&<ActionNotice kind="info">Invitations will display here after a server-authorized lookup. None are being fabricated for this review.</ActionNotice>}
    {route.startsWith("/admin/staff/[id]")&&<ActionNotice kind="info">A real staff profile and permissions will only be displayed after a Super Admin account and record-level authorization are validated.</ActionNotice>}
    <button type="button" className="auth-submit auth-secondary-submit" onClick={()=>setFeedback(true)} aria-describedby={feedback?`action-info-${stateId}`:undefined}>Review action: {action}<span aria-hidden="true">→</span></button>
    {feedback&&<div id={`action-info-${stateId}`}><ActionNotice>Action acknowledged for frontend review only. {action} requires the trusted backend; no email, code, session, invitation, profile, account status or other record was changed. Use the recovery links below or the development explorer to inspect the next documented state.</ActionNotice></div>}
  </div>;
}
