"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";

type Item={id:string;name:string};
type Props={
  kind:"verification"|"supply"; id:string; actorId:string; actorRole:string;
  assignedToId:string|null; assignedToName:string|null; evidenceReady:boolean;
  supply?:{quantity:string;unit:string;visits:Item[];specifications:Item[]};
};
export function OperationsReviewControls({kind,id,actorId,actorRole,assignedToId,assignedToName,evidenceReady,supply}:Props){
  const router=useRouter();
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [takeoverReason,setTakeoverReason]=useState("");
  const assigned=assignedToId===actorId;
  const takeover=!!assignedToId&&!assigned&&actorRole==="SUPER_ADMIN";
  const url=`/api/operations/reviews/${kind}/${id}`;
  async function send(path:string,body:Record<string,unknown>){
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch(path,{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const payload=await response.json().catch(()=>({error:"Unexpected server response."}));
      if(!response.ok||!payload.ok){setError(payload.error||"The case could not be updated. Refresh and try again.");return false;}
      setNotice("Saved. Updating the review workspace…");router.refresh();return true;
    }catch{setError("Connection failed. No review decision was recorded. Please retry.");return false;}
    finally{setBusy(false);}
  }
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(busy)return;
    const form=new FormData(e.currentTarget);
    const clicked=(e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
    const decision=clicked?.value;
    if(!["approve","more_info","reject"].includes(decision||"")){setError("Choose a review decision.");return;}
    const body=Object.fromEntries(form.entries());body.decision=decision!;
    if(await send(url,body)){router.push(kind==="verification"?"/operations/verification":"/operations/supply");}
  }
  return <section className="agro-panel" aria-label="Operations review decision">
    <h2>Review ownership and decision</h2>
    <p>{assignedToId?`Assigned to ${assignedToName||"an Operations reviewer"}.`:"Not yet claimed by a reviewer."} Only the assigned reviewer can decide this case.</p>
    {!assigned&&(!assignedToId||takeover)&&<div className="agro-actions">
      {takeover&&<div className="agro-field"><label htmlFor="takeover-reason">Reason for Super Admin reassignment</label><textarea id="takeover-reason" value={takeoverReason} onChange={e=>setTakeoverReason(e.target.value)} maxLength={500} rows={3} placeholder="Explain why the existing assignment must change"/></div>}
      <button className="agro-button" type="button" disabled={busy||(takeover&&takeoverReason.trim().length<10)} onClick={()=>void send(`${url}/claim`,takeover?{override:true,reason:takeoverReason}:{})}>{busy?"Working…":takeover?"Take over assigned case":"Claim this review"}</button>
    </div>}
    {!assigned&&assignedToId&&!takeover&&<p className="agro-hint">This case is already assigned. Contact a Super Admin if reassignment is necessary.</p>}
    {assigned&&<form onSubmit={submit} className="agro-form">
      <p className="agro-alert">Approvals require independently accepted Field Agent evidence. Report acceptance is not itself farmer or supply approval. Rejections and information requests must explain the next action.</p>
      {!evidenceReady&&<p className="agro-error">Evidence gate incomplete: request more information or wait for an accepted field report with private evidence.</p>}
      {supply&&<div className="agro-form-grid">
        <div className="agro-field"><label htmlFor="evidenceVisitId">Accepted inspection report (for approval)</label><select name="evidenceVisitId" id="evidenceVisitId" defaultValue=""><option value="">Select reviewed inspection</option>{supply.visits.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
        <div className="agro-field"><label htmlFor="observedQuantity">Physically observed quantity (for approval)</label><input id="observedQuantity" name="observedQuantity" type="number" min="0.001" max="1000000000" step="0.001" placeholder={`Declared: ${supply.quantity}`}/></div>
        <div className="agro-field"><label htmlFor="observedUnit">Observed unit (for approval)</label><select name="observedUnit" id="observedUnit" defaultValue=""><option value="">Select unit</option>{["KG","TONNE","BAG","PIECE"].map(unit=><option key={unit} value={unit}>{unit}</option>)}</select><p className="agro-hint">Declared unit: {supply.unit}. A mismatch must be returned to the farmer, not silently converted.</p></div>
        <div className="agro-field"><label htmlFor="specificationId">Observed commodity specification (optional)</label><select name="specificationId" id="specificationId" defaultValue=""><option value="">Not assessed / not specified</option>{supply.specifications.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><p className="agro-hint">Use only existing catalog specifications. No automatic quality grade or certification is implied.</p></div>
        <div className="agro-field"><label htmlFor="conditionNote">Physical condition assessment (for approval)</label><textarea id="conditionNote" name="conditionNote" rows={4} maxLength={2000} placeholder="Describe observed condition, packaging and handling; at least 20 characters"/></div>
      </div>}
      <div className="agro-field"><label htmlFor="review-note">Review decision and rationale</label><textarea id="review-note" name="note" minLength={5} maxLength={2000} rows={4} required placeholder="Explain the approval, rejection or exact information required"/></div>
      <label className="agro-field"><input type="checkbox" name="evidenceAcknowledged" value="yes"/> I reviewed the underlying evidence and understand this decision does not create stock reservations, orders or payments.</label>
      <div className="agro-actions"><button type="submit" name="decision" value="approve" className="agro-button" disabled={busy||!evidenceReady}>Approve</button><button type="submit" name="decision" value="more_info" className="agro-button agro-secondary" disabled={busy}>Request information</button><button type="submit" name="decision" value="reject" className="agro-button agro-secondary" disabled={busy}>Reject</button></div>
    </form>}
    {error&&<p role="alert" className="agro-error">{error}</p>}{notice&&<p role="status" className="agro-success">{notice}</p>}
  </section>;
}
