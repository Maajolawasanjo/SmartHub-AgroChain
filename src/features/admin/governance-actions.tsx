"use client";
import {useRef,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
const categories=["ACCESS","FINANCIAL_EXCEPTION","SOURCING","DELIVERY","COMPLIANCE","SYSTEM"] as const;
const reasons=["INVESTIGATION","DOCUMENTED_ACTION","RISK_REVIEW","EXTERNAL_RESOLUTION","FALSE_POSITIVE","ESCALATION","REOPENED"] as const;
async function post(url:string,body:unknown){
 const response=await fetch(url,{method:"POST",credentials:"same-origin",cache:"no-store",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const result=await response.json().catch(()=>({error:"Invalid server response."}));
 if(!response.ok||!result.ok)throw new Error(result.error||"Governance action not recorded.");
 return result as {ok:true;id:string;status:string;version:number};
}
export function GovernanceIncidentCreate(){
 const router=useRouter();
 const[category,setCategory]=useState<string>("SYSTEM"),[severity,setSeverity]=useState<string>("MEDIUM"),
 [title,setTitle]=useState(""),[description,setDescription]=useState(""),
 [subjectType,setSubjectType]=useState(""),[subjectId,setSubjectId]=useState(""),
 [busy,setBusy]=useState(false),[error,setError]=useState("");
 const key=useRef<string|null>(null);
 const reset=()=>{key.current=null;};
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;
  setBusy(true);setError("");key.current??=crypto.randomUUID();
  try{
   const r=await post("/api/admin/governance/incidents",{clientKey:key.current,category,severity,title,description,
    subjectType:subjectType||null,subjectId:subjectType?subjectId:null});
   router.push("/admin/governance/"+r.id);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to open incident.");setBusy(false);}
 }
 return <form className="agro-panel agro-field" onSubmit={submit}><h2>Document a governance incident</h2>
 <p>Record facts and a linked real record. This is an investigation, not a financial adjustment, identity suspension, or confirmation that an issue is resolved.</p>
 <label>Category *</label><select value={category} onChange={e=>{setCategory(e.target.value);reset();}}>
 {categories.map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select>
 <label>Severity *</label><select value={severity} onChange={e=>{setSeverity(e.target.value);reset();}}>
 {["LOW","MEDIUM","HIGH","CRITICAL"].map(x=><option key={x} value={x}>{x}</option>)}</select>
 <label>Incident title *</label><input required minLength={8} maxLength={180} value={title} onChange={e=>{setTitle(e.target.value);reset();}}/>
 <label>Detailed explanation / evidence reference *</label><textarea required minLength={20} maxLength={2000} value={description} onChange={e=>{setDescription(e.target.value);reset();}}/>
 <label>Linked real record type (optional)</label><select value={subjectType} onChange={e=>{setSubjectType(e.target.value);setSubjectId("");reset();}}>
 <option value="">No specific record</option>{["ACCOUNT","ORDER","BUYER_PAYMENT","SUPPLIER_OBLIGATION","SHIPMENT","SUPPORT_CASE"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select>
 {subjectType&&<><label>Record UUID — must exist</label><input required pattern="[0-9a-fA-F-]{36}" value={subjectId} onChange={e=>{setSubjectId(e.target.value);reset();}} placeholder="Existing record UUID"/></>}
 <button className="agro-button" type="submit" disabled={busy||title.trim().length<8||description.trim().length<20}>{busy?"Recording…":"Open investigation"}</button>
 {error&&<p className="agro-error" role="alert">{error}</p>}
 </form>;
}
export function GovernanceIncidentControls({id,status,version,assignee,admins}:{id:string;status:string;version:number;assignee:string|null;admins:{id:string;fullName:string}[]}){
 const router=useRouter();const[note,setNote]=useState(""),[reasonCode,setReason]=useState("INVESTIGATION"),
 [assignedToId,setAssigned]=useState(assignee??""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const transitions:Record<string,string[]>={
  OPEN:["INVESTIGATING"],INVESTIGATING:["MITIGATED"],MITIGATED:["CLOSED","INVESTIGATING"],CLOSED:["OPEN"]
 };
 async function submit(action:"transition"|"assign",next?:string){
  if(!window.confirm("Record governance "+(next??"assignment")+"? This does not change the linked source transaction."))return;
  setBusy(true);setError("");
  try{
   const body=action==="assign"?{expectedVersion:version,assignedToId:assignedToId||null,reasonCode,note}:
    {expectedVersion:version,action:next,reasonCode,note};
   await post("/api/admin/governance/incidents/"+id+"/"+action,body);
   router.refresh();setNote("");
  }catch(e){setError(e instanceof Error?e.message:"Action not recorded.");}finally{setBusy(false);}
 }
 return <section className="agro-panel agro-field"><h2>Independent governance review</h2>
 <p>Current status: <strong>{status.replaceAll("_"," ")}</strong> · Version {version}. Every change needs a reason and is appended to the audit trail. Source payment, bank, inventory and delivery state cannot be overridden here.</p>
 <label>Reason code *</label><select value={reasonCode} onChange={e=>setReason(e.target.value)}>
 {reasons.map(r=><option key={r} value={r}>{r.replaceAll("_"," ")}</option>)}</select>
 <label>Decision and supporting rationale (minimum 12 characters) *</label>
 <textarea minLength={12} maxLength={1500} value={note} onChange={e=>setNote(e.target.value)}/>
 <div className="agro-actions">{(transitions[status]??[]).map(next=><button key={next} type="button" className="action action-outline" disabled={busy||note.trim().length<12} onClick={()=>void submit("transition",next)}>
 {next==="OPEN"?"Reopen investigation":"Move to "+next.replaceAll("_"," ").toLowerCase()}</button>)}</div>
 {status!=="CLOSED"&&<><label>Assign to active Super Admin</label><select value={assignedToId} onChange={e=>setAssigned(e.target.value)}>
 <option value="">Unassigned</option>{admins.map(a=><option value={a.id} key={a.id}>{a.fullName}</option>)}</select>
 <button className="action action-outline" type="button" disabled={busy||note.trim().length<12||(assignedToId||null)===assignee}
 onClick={()=>void submit("assign")}>Save assignment</button></>}
 {error&&<p className="agro-error" role="alert">{error}</p>}
 </section>;
}
