"use client";

import {useRouter} from "next/navigation";
import {useState,type FormEvent} from "react";
import {NIGERIA_STATES} from "@/lib/nigeria-states";
import {STAFF_ROLES,type StaffRole} from "@/server/admin/permissions";

type ApiResult={ok?:boolean;message?:string;error?:string;next?:string};
async function send(url:string,method:string,body:unknown):Promise<ApiResult>{
  const response=await fetch(url,{method,credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({error:"The server returned an unreadable response."}));
  if(!response.ok)throw new Error(typeof result.error==="string"?result.error:"The request could not be completed.");
  return result as ApiResult;
}
function ErrorText({message}:{message:string}){return <p className="staff-form-message staff-form-message--error" role="alert">{message}</p>}
function SuccessText({message}:{message:string}){return <p className="staff-form-message staff-form-message--success" role="status">{message}</p>}
function PasswordField({value,onChange}:{value:string;onChange:(value:string)=>void}){
  return <label className="staff-field"><span>Confirm your password</span><input autoComplete="current-password" type="password" value={value} onChange={event=>onChange(event.target.value)} required minLength={1}/></label>;
}

export function StaffInviteForm(){
  const router=useRouter();const [email,setEmail]=useState("");const [role,setRole]=useState<StaffRole>("FIELD_AGENT");const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [success,setSuccess]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");setSuccess("");try{const result=await send("/api/admin/staff/invite","POST",{email,role,currentPassword:password});setSuccess(result.message??"Invitation sent.");setPassword("");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Invitation failed.");}finally{setBusy(false);}}
  return <form className="staff-form" onSubmit={submit}>
    <div className="staff-form-grid"><label className="staff-field"><span>Staff email</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} required/></label>
    <label className="staff-field"><span>Role</span><select value={role} onChange={e=>setRole(e.target.value as StaffRole)}>{STAFF_ROLES.map(item=><option key={item} value={item}>{item==="FIELD_AGENT"?"Field Agent":"Operations"}</option>)}</select></label></div>
    <PasswordField value={password} onChange={setPassword}/>
    <p className="staff-form-hint">The invitee receives an email link. The role is assigned by SmartHub, not selected by the invitee. Invitation expires after 7 days.</p>
    {error&&<ErrorText message={error}/>}{success&&<SuccessText message={success}/>}
    <button className="staff-primary-button" type="submit" disabled={busy}>{busy?"Sending invitation…":"Send staff invitation"}</button>
  </form>;
}

export function StaffRoleForm({staffId,currentRole}:{staffId:string;currentRole:StaffRole}){
  const router=useRouter();const [role,setRole]=useState<StaffRole>(currentRole);const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [success,setSuccess]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");setSuccess("");try{const result=await send(`/api/admin/staff/${staffId}/role`,"PATCH",{role,currentPassword:password});setSuccess(result.message??"Role updated.");setPassword("");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Role update failed.");}finally{setBusy(false);}}
  return <form className="staff-form" onSubmit={submit}><label className="staff-field"><span>Assigned role</span><select value={role} onChange={e=>setRole(e.target.value as StaffRole)}>{STAFF_ROLES.map(item=><option key={item} value={item}>{item==="FIELD_AGENT"?"Field Agent":"Operations"}</option>)}</select></label>
    <div className="staff-warning"><strong>Permission impact</strong><p>Changing a role replaces its fixed permission template. Switching away from Field Agent deactivates all state assignments. Reassign them only after the new role is reviewed.</p></div>
    <PasswordField value={password} onChange={setPassword}/>{error&&<ErrorText message={error}/>}{success&&<SuccessText message={success}/>}
    <button className="staff-primary-button" type="submit" disabled={busy||role===currentRole}>{busy?"Saving role…":"Save role change"}</button>
  </form>;
}

export function StaffStatusForm({staffId,currentStatus}:{staffId:string;currentStatus:"ACTIVE"|"SUSPENDED"|"DISABLED"}){
  const router=useRouter();const [reason,setReason]=useState("");const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [success,setSuccess]=useState("");
  const nextStatus=currentStatus==="ACTIVE"?"SUSPENDED":"ACTIVE";
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!window.confirm(nextStatus==="SUSPENDED"?"Suspend this staff member’s SmartHub access?":"Reinstate this staff member’s SmartHub access?"))return;setBusy(true);setError("");setSuccess("");try{const result=await send(`/api/admin/staff/${staffId}/status`,"PATCH",{status:nextStatus,reason,currentPassword:password});setSuccess(result.message??"Staff status updated.");setPassword("");setReason("");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Status update failed.");router.refresh();}finally{setBusy(false);}}
  if(currentStatus==="DISABLED")return <div className="staff-warning"><strong>Disabled account</strong><p>This account cannot be reinstated from the standard staff workflow. Use the approved account recovery process.</p></div>;
  return <form className="staff-form" onSubmit={submit}><div className="staff-warning"><strong>{nextStatus==="SUSPENDED"?"Suspend access":"Reinstate access"}</strong><p>{nextStatus==="SUSPENDED"?"SmartHub will deny application access, request a Supabase Auth ban, and deactivate active Field Agent state scopes. Existing access tokens may remain valid until expiry, but server routes must enforce the database status.":"SmartHub will lift the Supabase Auth ban and restore account access. Field Agent state scopes stay inactive and must be explicitly reassigned."}</p></div>
    <label className="staff-field"><span>Reason for this change</span><textarea value={reason} onChange={e=>setReason(e.target.value)} minLength={8} maxLength={500} rows={4} required placeholder="Record the operational reason for this access change."/></label>
    <PasswordField value={password} onChange={setPassword}/>{error&&<ErrorText message={error}/>}{success&&<SuccessText message={success}/>}
    <button className={nextStatus==="SUSPENDED"?"staff-danger-button":"staff-primary-button"} type="submit" disabled={busy}>{busy?"Updating access…":nextStatus==="SUSPENDED"?"Suspend staff access":"Reinstate staff access"}</button>
  </form>;
}

export function FieldAgentAssignmentsForm({staffId,initialStates,previousStates}:{staffId:string;initialStates:string[];previousStates:string[]}){
  const router=useRouter();const [states,setStates]=useState<string[]>(initialStates);const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [success,setSuccess]=useState("");
  function toggle(state:string,checked:boolean){setStates(current=>checked?[...current,state]:current.filter(item=>item!==state));}
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");setSuccess("");try{const result=await send(`/api/admin/staff/${staffId}/assignments`,"PUT",{states,currentPassword:password});setSuccess(result.message??"Assignments saved.");setPassword("");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Assignments could not be saved.");}finally{setBusy(false);}}
  return <form className="staff-form" onSubmit={submit}><div className="staff-warning"><strong>State scope</strong><p>These are access scopes, not a farmer assignment or a completed field visit. Field workflows must filter records by these active scopes when that module is implemented.</p>{previousStates.length>0&&<p>Previously assigned, currently inactive: {previousStates.join(", ")}. Select a state again to reactivate it.</p>}</div>
    <div className="staff-state-grid">{NIGERIA_STATES.map(state=><label className="staff-state-option" key={state}><input type="checkbox" checked={states.includes(state)} onChange={e=>toggle(state,e.target.checked)}/><span>{state}</span></label>)}</div>
    <PasswordField value={password} onChange={setPassword}/>{error&&<ErrorText message={error}/>}{success&&<SuccessText message={success}/>}
    <button className="staff-primary-button" type="submit" disabled={busy}>{busy?"Saving assignments…":"Save state assignments"}</button>
  </form>;
}

export function StaffAuthSyncForm({staffId}:{staffId:string}){
  const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [success,setSuccess]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");setSuccess("");try{const result=await send(`/api/admin/staff/${staffId}/auth-sync`,"POST",{currentPassword:password});setSuccess(result.message??"Auth status synchronized.");setPassword("");}catch(e){setError(e instanceof Error?e.message:"Authentication status could not be synchronized.");}finally{setBusy(false);}}
  return <form className="staff-form" onSubmit={submit}><div className="staff-warning"><strong>Authentication provider sync</strong><p>Reconcile the Supabase Auth ban with the current SmartHub account status. This does not change the account's SmartHub status.</p></div><PasswordField value={password} onChange={setPassword}/>{error&&<ErrorText message={error}/>}{success&&<SuccessText message={success}/>}<button className="staff-secondary-button" type="submit" disabled={busy}>{busy?"Synchronizing…":"Sync Auth to current status"}</button></form>;
}

export function InvitationRevokeForm({invitationId}:{invitationId:string}){
  const router=useRouter();const [reason,setReason]=useState("");const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [success,setSuccess]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!window.confirm("Revoke this pending invitation? Its acceptance flow will be blocked."))return;setBusy(true);setError("");setSuccess("");try{const result=await send(`/api/admin/staff/invitations/${invitationId}`,"PATCH",{reason,currentPassword:password});setSuccess(result.message??"Invitation revoked.");setPassword("");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Invitation could not be revoked.");}finally{setBusy(false);}}
  return <form className="staff-inline-form" onSubmit={submit}><label className="staff-field"><span>Reason</span><input value={reason} onChange={e=>setReason(e.target.value)} minLength={8} maxLength={500} required/></label><label className="staff-field"><span>Confirm password</span><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<ErrorText message={error}/>}{success&&<SuccessText message={success}/>}<button className="staff-danger-button" type="submit" disabled={busy}>{busy?"Revoking…":"Revoke invitation"}</button></form>;
}
