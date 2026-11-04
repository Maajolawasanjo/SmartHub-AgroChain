"use client";
import {useRouter} from "next/navigation";
import {useState,type FormEvent} from "react";

async function post(endpoint:string,body:unknown){
 const res=await fetch(endpoint,{method:"POST",credentials:"same-origin",cache:"no-store",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const result=await res.json().catch(()=>({error:"Invalid server response."}));
 if(!res.ok||!result.ok)throw new Error(result.error||"The operation could not be completed.");
 return result as {id:string;status:string};
}
export function ActionButton({endpoint,body,label,confirmText}:{endpoint:string;body?:unknown;label:string;confirmText?:string}){
 const router=useRouter();const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function click(){
  if(busy)return;
  if(confirmText&&!window.confirm(confirmText))return;
  setBusy(true);setError("");
  try{await post(endpoint,body??{});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Action failed.");}
  finally{setBusy(false);}
 }
 return <span><button type="button" className="action action-outline" disabled={busy} onClick={()=>void click()}>{busy?"Saving…":label}</button>{error&&<span role="alert" className="agro-error">{error}</span>}</span>;
}
export function MatchBuilder({requestLineId,supplies}:{requestLineId:string;supplies:{id:string;label:string;maximum:string}[]}){
 const router=useRouter();const[supplyId,setSupplyId]=useState(supplies[0]?.id||"");const[quantity,setQuantity]=useState("");const[note,setNote]=useState("");
 const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function send(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  try{await post("/api/operations/matching",{requestLineId,supplyId,quantity,note});setQuantity("");setNote("");router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Could not create match.");}finally{setBusy(false);}
 }
 if(!supplies.length)return <p className="agro-hint">No approved, evidence-backed supply was eligible for this commodity and unit. Confirm physical quality and supplier verification before matching.</p>;
 return <form className="agro-field" onSubmit={send}>
  <label>Verified supply candidate</label>
  <select value={supplyId} onChange={e=>setSupplyId(e.target.value)} required>{supplies.map(s=><option value={s.id} key={s.id}>{s.label} · observed up to {s.maximum}</option>)}</select>
  <label>Proposed quantity (not reserved)</label>
  <input value={quantity} onChange={e=>setQuantity(e.target.value)} type="number" min="0.001" max="1000000000" step="0.001" required/>
  <label>Internal suitability note (optional)</label>
  <textarea value={note} maxLength={1000} onChange={e=>setNote(e.target.value)}/>
  <button className="agro-button" disabled={busy} type="submit">{busy?"Checking…":"Propose supply candidate"}</button>
  {error&&<p className="agro-error" role="alert">{error}</p>}
 </form>;
}
export function OpportunityResponseForm({matchId}:{matchId:string}){
 const router=useRouter();const[note,setNote]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function respond(action:"INTERESTED"|"DECLINED"){
  if(busy)return;
  if(action==="INTERESTED"&&!window.confirm("Confirm interest? SmartHub will review suitability. This is not an order."))return;
  setBusy(true);setError("");
  try{await post("/api/farmer/opportunities/"+matchId+"/respond",{action,note});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Response failed.");}finally{setBusy(false);}
 }
 return <div className="agro-field"><label>Optional note to SmartHub Operations</label><textarea value={note} maxLength={1000} onChange={e=>setNote(e.target.value)}/><div className="agro-actions">
  <button className="agro-button" type="button" disabled={busy} onClick={()=>void respond("INTERESTED")}>I am interested</button>
  <button className="action action-outline" type="button" disabled={busy} onClick={()=>void respond("DECLINED")}>Decline opportunity</button></div>{error&&<p role="alert" className="agro-error">{error}</p>}</div>;
}
type MatchOption={id:string;label:string};
type QuoteRow={requestLineId:string;title:string;matches:MatchOption[]};
export function QuoteBuilder({requestId,rows,expectedVersion}:{requestId:string;rows:QuoteRow[];expectedVersion?:number}){
 const router=useRouter();const[terms,setTerms]=useState("");const[validUntil,setValidUntil]=useState("");
 const[choices,setChoices]=useState(rows.map(x=>({requestLineId:x.requestLineId,matchId:x.matches[0]?.id||"",unitPriceNgn:""})));
 const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function send(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(choices.some(x=>!x.matchId)){setError("Every requested commodity needs an interested supplier match.");return;}
  setBusy(true);setError("");
  try{
   const result=await post("/api/operations/quotes",{requestId,expectedVersion,terms,validUntil:new Date(validUntil).toISOString(),lines:choices.map(c=>({matchId:c.matchId,unitPriceNgn:c.unitPriceNgn}))});
   router.push("/operations/quotes/"+result.id);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Quotation could not be saved.");}finally{setBusy(false);}
 }
 if(!rows.length||rows.some(r=>!r.matches.length))return <p className="agro-hint">An interested, verified-supply candidate is required for every request line before a quotation can be prepared.</p>;
 return <form onSubmit={send} className="agro-panel agro-field"><h2>Prepare NGN quotation</h2><p>Pricing is an explicit Operations proposal. It is not generated from invented market prices. Each quotation requires separate Super Admin approval.</p>
  {rows.map((row,index)=><fieldset className="request-line" key={row.requestLineId}><legend>{row.title}</legend>
   <label>Interested candidate (internal)</label><select value={choices[index].matchId} onChange={e=>setChoices(c=>c.map((v,i)=>i===index?{...v,matchId:e.target.value}:v))}>{row.matches.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select>
   <label>Unit price in NGN *</label><input value={choices[index].unitPriceNgn} onChange={e=>setChoices(c=>c.map((v,i)=>i===index?{...v,unitPriceNgn:e.target.value}:v))} type="number" min="0.01" step="0.01" required/>
  </fieldset>)}
  <label>Quotation terms (explicitly reviewed, no default commercial policy) *</label>
  <textarea minLength={20} maxLength={4000} required value={terms} onChange={e=>setTerms(e.target.value)} placeholder="Specify procurement, quality, delivery, cancellation, price inclusions, approval and validity conditions approved by SmartHub."/>
  <label>Valid until *</label><input type="datetime-local" required value={validUntil} onChange={e=>setValidUntil(e.target.value)}/>
  <button className="agro-button" disabled={busy} type="submit">{busy?"Saving…":"Save quotation draft"}</button>
  {error&&<p className="agro-error" role="alert">{error}</p>}
 </form>;
}
export function QuoteTransitions({id,version,status,role}:{id:string;version:number;status:string;role:string}){
 const router=useRouter();const[note,setNote]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 const allowed=role==="SUPER_ADMIN"?(status==="PENDING_APPROVAL"?[{action:"approve",label:"Approve"},{action:"reject",label:"Return for changes"}]:[]):status==="DRAFT"?[{action:"submit",label:"Request Super Admin approval"}]:status==="APPROVED"?[{action:"issue",label:"Issue official quote to buyer"}]:status==="ISSUED"?[{action:"expire",label:"Record expiry (after deadline)"}]:[];
 async function execute(action:string){
  if(busy||!window.confirm("Confirm quotation action: "+action+"?"))return;
  setBusy(true);setError("");
  try{await post("/api/operations/quotes/"+id+"/transition",{action,note,expectedVersion:version});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Could not change quotation state.");}finally{setBusy(false);}
 }
 return <section className="agro-panel agro-field"><h2>Quotation decisions</h2><p>Approval and issuance require separate authorized actors. No payment or inventory reservation is triggered.</p>
  {allowed.length?<><label>Decision rationale / buyer-visible note</label><textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/><div className="agro-actions">{allowed.map(a=><button className="agro-button" disabled={busy||(a.action==="reject"&&note.trim().length<10)} type="button" key={a.action} onClick={()=>void execute(a.action)}>{a.label}</button>)}</div></>:<p>No permitted action is available for your role in the current quotation state.</p>}
  {error&&<p className="agro-error" role="alert">{error}</p>}
 </section>;
}
export function BuyerQuoteDecision({id,version,owner}:{id:string;version:number;owner:boolean}){
 const router=useRouter();const[busy,setBusy]=useState(false);const[error,setError]=useState("");const[note,setNote]=useState("");
 async function decide(decision:"accept"|"decline"){
  if(busy||!window.confirm("Record your "+decision+" decision for this official SmartHub quotation? This will not create or pay for an order."))return;
  setBusy(true);setError("");
  try{await post("/api/buyer/quotes/"+id+"/decision",{decision,expectedVersion:version,note});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Decision was not recorded.");}finally{setBusy(false);}
 }
 return <section className="buyer-panel"><h2>Quotation decision</h2><p>Acceptance records your decision only. It does not reserve stock, create a payable order or confirm payment. Further commercial authorization and an order workflow are required.</p>
 {owner?<><label htmlFor="buyer-quote-note">Optional decision note</label><textarea id="buyer-quote-note" value={note} maxLength={2000} onChange={e=>setNote(e.target.value)}/><div className="agro-actions"><button className="agro-button" disabled={busy} type="button" onClick={()=>void decide("accept")}>Accept quotation</button><button className="action action-outline" disabled={busy} type="button" onClick={()=>void decide("decline")}>Decline quotation</button></div></>:<p>Your organization's owner must make the formal decision.</p>}
 {error&&<p role="alert" className="agro-error">{error}</p>}</section>;
}
