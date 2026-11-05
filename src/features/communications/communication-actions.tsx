"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
async function send(path:string,body:unknown={}){
 const response=await fetch(path,{method:"POST",credentials:"same-origin",cache:"no-store",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const result=await response.json().catch(()=>({error:"Invalid server response."}));
 if(!response.ok||!result.ok)throw new Error(result.error||"The action was not confirmed.");
 return result as {id?:string;reference?:string;status?:string;ok:true;updated?:number};
}
export function InboxRefresh(){
 const router=useRouter();
 useEffect(()=>{
  const timer=setInterval(()=>{if(document.visibilityState==="visible")router.refresh();},20000);
  return ()=>clearInterval(timer);
 },[router]);
 return <button className="action action-outline" type="button" onClick={()=>router.refresh()}>Refresh inbox</button>;
}
export function InboxAction({id,read}:{id:string;read:boolean}){
 const router=useRouter();const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function change(){setBusy(true);setError("");
  try{await send("/api/inbox/"+id+"/read",{read:!read});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Could not change read state.");}finally{setBusy(false);}
 }
 return <div><button type="button" className="action action-outline" disabled={busy} onClick={()=>void change()}>{busy?"Updating…":read?"Mark unread":"Mark read"}</button>{error&&<p role="alert" className="agro-error">{error}</p>}</div>;
}
export function InboxReadAll(){
 const router=useRouter();const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function run(){setBusy(true);setError("");try{await send("/api/inbox/read-all");router.refresh();}
 catch(e){setError(e instanceof Error?e.message:"Unable to mark messages read.");}finally{setBusy(false);}}
 return <div><button className="action action-outline" type="button" disabled={busy} onClick={()=>void run()}>{busy?"Updating…":"Mark all read"}</button>{error&&<p className="agro-error" role="alert">{error}</p>}</div>;
}
type Preference={procurement:boolean;finance:boolean;logistics:boolean;support:boolean};
export function NotificationPreferences({initial}:{initial:Preference}){
 const router=useRouter(),[value,setValue]=useState<Preference>(initial),[busy,setBusy]=useState(false),
 [error,setError]=useState(""),[success,setSuccess]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setSuccess("");
  try{await send("/api/preferences/notifications",value);setSuccess("In-app category preferences saved.");router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Preferences were not saved.");}finally{setBusy(false);}
 }
 return <form className="agro-panel agro-field" onSubmit={submit}>
 <h2>In-app notification preferences</h2>
 <p>These preferences control only notifications inside SmartHub. Security and important account-access messages cannot be disabled. Email, SMS, WhatsApp and push delivery are not configured.</p>
 {(["procurement","finance","logistics","support"] as const).map(k=><label key={k}><input type="checkbox" checked={value[k]} onChange={e=>setValue(prev=>({...prev,[k]:e.target.checked}))}/> {k[0].toUpperCase()+k.slice(1)} updates</label>)}
 <button type="submit" className="agro-button" disabled={busy}>{busy?"Saving…":"Save preferences"}</button>
 {success&&<p role="status">{success}</p>}{error&&<p className="agro-error" role="alert">{error}</p>}
 </form>;
}
export function SupportOpenForm(){
 const router=useRouter();const[category,setCategory]=useState("OTHER"),[subject,setSubject]=useState(""),
 [message,setMessage]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const key=useRef<string|null>(null);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");
  key.current??=crypto.randomUUID();
  try{const data=await send("/api/support/cases",{clientKey:key.current,category,subject,message});
   if(!data.id)throw new Error("Case reference unavailable.");
   router.push("/support/cases/"+data.id);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not open case.");setBusy(false);}
 }
 const reset=()=>{key.current=null;};
 return <form className="agro-panel agro-field" onSubmit={submit}><h2>Create a support case</h2>
 <p>Send a real message to SmartHub Operations. Do not submit card numbers, account PINs, passwords, OTPs or sensitive third-party personal data.</p>
 <label htmlFor="case-category">Issue category</label><select id="case-category" value={category} onChange={e=>{setCategory(e.target.value);reset();}}>
 {["SOURCING","PAYMENTS","DELIVERY","SUPPLIER_SETTLEMENT","ACCOUNT","OTHER"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select>
 <label htmlFor="case-subject">Subject *</label><input id="case-subject" minLength={6} maxLength={160} required value={subject} onChange={e=>{setSubject(e.target.value);reset();}}/>
 <label htmlFor="case-message">Describe the issue *</label><textarea id="case-message" minLength={12} maxLength={4000} required value={message} onChange={e=>{setMessage(e.target.value);reset();}}/>
 <button className="agro-button" type="submit" disabled={busy||subject.trim().length<6||message.trim().length<12}>{busy?"Submitting…":"Open support case"}</button>
 {error&&<p className="agro-error" role="alert">{error}</p>}</form>;
}
export function SupportMessageForm({caseId,canInternal}:{caseId:string;canInternal:boolean}){
 const router=useRouter();const[body,setBody]=useState(""),[internal,setInternal]=useState(false),
 [busy,setBusy]=useState(false),[error,setError]=useState("");
 const key=useRef<string|null>(null);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");
  key.current??=crypto.randomUUID();
  try{await send("/api/support/cases/"+caseId+"/messages",{clientKey:key.current,body,internal});
   key.current=null;setBody("");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not send message.");}finally{setBusy(false);}
 }
 return <form className="agro-panel agro-field" onSubmit={submit}><h2>{internal?"Add internal investigation note":"Reply to support"}</h2>
 <textarea minLength={1} maxLength={4000} required value={body} onChange={e=>{setBody(e.target.value);key.current=null;}}/>
 {canInternal&&<label><input type="checkbox" checked={internal} onChange={e=>{setInternal(e.target.checked);key.current=null;}}/> Internal staff-only note (never visible to case owner)</label>}
 <button className="agro-button" type="submit" disabled={busy||!body.trim()}>{busy?"Saving…":internal?"Record internal note":"Send reply"}</button>
 {error&&<p className="agro-error" role="alert">{error}</p>}</form>;
}
export function SupportStateActions({caseId,staff,owner,status,assigned,actorId}:{
 caseId:string;staff:boolean;owner:boolean;status:string;assigned:string|null;actorId:string;
}){
 const router=useRouter();const[note,setNote]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const actions=staff?[
  ...(!assigned||assigned===actorId?["claim"]:[]),
  ...(assigned===actorId&&status!=="CLOSED"?["resume","await_customer","resolve"]:[]),
  ...(status==="RESOLVED"?["close"]:[])
 ]:owner&&status==="RESOLVED"?["reopen"]:[];
 async function submit(action:string){if(busy||!window.confirm("Record support action: "+action+"?"))return;
  setBusy(true);setError("");
  try{await send("/api/support/cases/"+caseId+"/transition",{action,note});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Support status unchanged.");}finally{setBusy(false);}
 }
 if(!actions.length)return null;
 return <section className="agro-panel agro-field"><h2>Case workflow</h2><label>Required action reason *</label>
 <textarea minLength={10} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/>
 <div className="agro-actions">{[...new Set(actions)].map(action=><button key={action} type="button" className="action action-outline" disabled={busy||note.trim().length<10} onClick={()=>void submit(action)}>{action.replaceAll("_"," ")}</button>)}</div>
 {error&&<p role="alert" className="agro-error">{error}</p>}</section>;
}
