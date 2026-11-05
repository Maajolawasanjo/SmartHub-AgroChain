"use client";
import {useRouter} from "next/navigation";
import {useRef,useState,type FormEvent} from "react";
import {NIGERIA_STATES} from "@/features/auth/auth-rules";
import type {RequestDraft} from "@/server/requests/validation";
import {blankLine} from "@/server/requests/presentation";

type Option={id:string;name:string};
type Commodity=Option & {types:Option[];specifications:Option[]};
type Mode="create"|"edit"|"clarification";
type Destination={id:string;label:string;state:string;city:string;addressLine:string};
type Props={mode:Mode;id?:string;version?:number;initial:RequestDraft;commodities:Commodity[];destinations?:Destination[];profileReady:boolean;question?:string};
export function SourcingRequestForm({mode,id,version,initial,commodities,destinations=[],profileReady,question}:Props){
 const router=useRouter();const createKey=useRef<string|null>(null);const [draft,setDraft]=useState<RequestDraft>(initial);const [answer,setAnswer]=useState("");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const change=(field:keyof Omit<RequestDraft,"lines">,value:string)=>setDraft(v=>({...v,[field]:value}));
 const lineChange=(index:number,field:keyof RequestDraft["lines"][number],value:string|boolean)=>setDraft(v=>({...v,lines:v.lines.map((l,i)=>i===index?{...l,[field]:value,...(field==="commodityId"?{typeId:"",specificationId:"",commodityName:""}:{})}:l)}));
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const button=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
  const action=button?.value==="submit"?"submit":"draft";
  if(action==="submit"&&!profileReady){setError("Complete the required business profile fields before submitting. Independent business verification is not required.");return;}
  if(mode==="clarification"&&action==="submit"&&answer.trim().length<5){setError("Explain how you addressed the Operations question.");return;}
  const endpoint=mode==="create"?"/api/buyer/requests":mode==="edit"?`/api/buyer/requests/${id}`:action==="draft"?`/api/buyer/requests/${id}/clarification/draft`:`/api/buyer/requests/${id}/respond`;
  const method=mode==="create"||mode==="clarification"&&action==="submit"?"POST":"PATCH";
  if(mode==="create"&&!createKey.current)createKey.current=crypto.randomUUID();
  const body=mode==="create"?{action,payload:draft,idempotencyKey:createKey.current}:mode==="clarification"&&action==="submit"?{expectedVersion:version,answer,payload:draft}:{action,expectedVersion:version,payload:draft};
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch(endpoint,{method,credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const result=await response.json().catch(()=>({error:"Unexpected response."}));
   if(!response.ok||!result.ok){setError(result.error||"Could not save the request. Your entries remain here.");return;}
   setNotice(action==="draft"?"Draft saved.":"Request submitted. Opening the recorded request…");
   router.push(`/dashboard/requests/${result.id??id}`);router.refresh();
  }catch{setError("Connection lost. No request update was confirmed. Retry when connected.");}
  finally{setBusy(false);}
 }
 return <form className="buyer-form" onSubmit={submit}>
  {mode==="clarification"&&<section className="buyer-note"><strong>Operations asked:</strong><p>{question}</p><div className="buyer-field"><label htmlFor="clarification-answer">Your response *</label><textarea id="clarification-answer" value={answer} onChange={e=>setAnswer(e.target.value)} minLength={5} maxLength={2000} placeholder="Explain the correction or supply the requested information"/></div></section>}
  <section className="buyer-panel"><div className="buyer-heading-row"><h2>1. Commodity and quantity</h2><span className="buyer-muted">Up to five items per request</span></div>
   {draft.lines.map((line,i)=>{const selected=commodities.find(c=>c.id===line.commodityId);return <fieldset key={i} className="request-line"><legend>Item {i+1}</legend>
    <div className="buyer-form-grid"><div className="buyer-field"><label htmlFor={`commodity-${i}`}>Commodity *</label><select id={`commodity-${i}`} value={line.commodityId} onChange={e=>lineChange(i,"commodityId",e.target.value)}><option value="">Other / not in catalogue</option>{commodities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
    {!line.commodityId&&<div className="buyer-field"><label htmlFor={`manual-${i}`}>Commodity description *</label><input id={`manual-${i}`} maxLength={120} value={line.commodityName} onChange={e=>lineChange(i,"commodityName",e.target.value)} placeholder="Describe the agricultural product"/></div>}
    {selected&&<><div className="buyer-field"><label htmlFor={`type-${i}`}>Published variety/type</label><select id={`type-${i}`} value={line.typeId} onChange={e=>lineChange(i,"typeId",e.target.value)}><option value="">Not specified</option>{selected.types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="buyer-field"><label htmlFor={`spec-${i}`}>Published specification</label><select id={`spec-${i}`} value={line.specificationId} onChange={e=>lineChange(i,"specificationId",e.target.value)}><option value="">Discuss during review</option>{selected.specifications.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div></>}
    <div className="buyer-field"><label htmlFor={`variety-${i}`}>Other variety details</label><input id={`variety-${i}`} value={line.variety} maxLength={120} onChange={e=>lineChange(i,"variety",e.target.value)}/></div>
    <div className="buyer-field"><label htmlFor={`quantity-${i}`}>Required quantity *</label><input id={`quantity-${i}`} type="number" min="0.001" max="1000000000" step="0.001" value={line.quantity} onChange={e=>lineChange(i,"quantity",e.target.value)}/></div>
    <div className="buyer-field"><label htmlFor={`unit-${i}`}>Unit *</label><select id={`unit-${i}`} value={line.unit} onChange={e=>lineChange(i,"unit",e.target.value)}><option value="">Choose unit</option>{["KG","TONNE","BAG","PIECE"].map(unit=><option key={unit} value={unit}>{unit}</option>)}</select></div>
    <div className="buyer-field"><label htmlFor={`packaging-${i}`}>Packaging / bag size</label><input id={`packaging-${i}`} maxLength={160} value={line.packaging} onChange={e=>lineChange(i,"packaging",e.target.value)} placeholder="For bags, specify bag weight/size"/></div>
    <div className="buyer-field"><label htmlFor={`quality-${i}`}>Quality / moisture / processing requirements</label><textarea id={`quality-${i}`} maxLength={1500} value={line.qualityNotes} onChange={e=>lineChange(i,"qualityNotes",e.target.value)}/></div></div>
    <label className="request-checkbox"><input type="checkbox" checked={line.flexible} onChange={e=>lineChange(i,"flexible",e.target.checked)}/> Quantity is flexible</label>
    {draft.lines.length>1&&<button className="buyer-delete" type="button" onClick={()=>setDraft(v=>({...v,lines:v.lines.filter((_,n)=>n!==i)}))}>Remove item</button>}
   </fieldset>})}
   {draft.lines.length<5&&<button className="action action-outline" type="button" onClick={()=>setDraft(v=>({...v,lines:[...v.lines,{...blankLine}]}))}>+ Add another commodity</button>}
   <p className="buyer-muted">Unlisted commodities are permitted for manual Operations assessment. Catalogue publication is not a stock, price or quality guarantee.</p>
  </section>
  <section className="buyer-panel"><h2>2. Delivery and timing</h2>{destinations.length>0&&<div className="buyer-field"><label htmlFor="saved-destination">Use a saved delivery destination (optional)</label><select id="saved-destination" defaultValue="" onChange={e=>{const selected=destinations.find(d=>d.id===e.target.value);if(selected)setDraft(v=>({...v,deliveryState:selected.state,deliveryCity:selected.city,deliveryAddress:selected.addressLine}));}}><option value="">Enter a location manually</option>{destinations.map(d=><option key={d.id} value={d.id}>{d.label} — {d.city}, {d.state}</option>)}</select></div>}<div className="buyer-form-grid">
   <div className="buyer-field"><label htmlFor="deliveryState">State / FCT *</label><select id="deliveryState" value={draft.deliveryState} onChange={e=>change("deliveryState",e.target.value)}><option value="">Select state</option>{NIGERIA_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
   <div className="buyer-field"><label htmlFor="deliveryCity">City / LGA *</label><input id="deliveryCity" maxLength={120} value={draft.deliveryCity} onChange={e=>change("deliveryCity",e.target.value)}/></div>
   <div className="buyer-field"><label htmlFor="fulfilmentMethod">Fulfilment preference *</label><select id="fulfilmentMethod" value={draft.fulfilmentMethod} onChange={e=>change("fulfilmentMethod",e.target.value)}><option value="">Select preference</option><option value="SMARTHUB_DELIVERY">SmartHub-coordinated delivery</option><option value="BUYER_PICKUP">Buyer collection / pickup</option><option value="THIRD_PARTY">Third-party logistics (subject to approval)</option></select></div>
   <div className="buyer-field"><label htmlFor="requiredDate">Required date / window start *</label><input id="requiredDate" type="date" value={draft.requiredDate} onChange={e=>change("requiredDate",e.target.value)}/></div>
   <div className="buyer-field"><label htmlFor="deliveryAddress">Delivery address {draft.fulfilmentMethod==="SMARTHUB_DELIVERY"?"*":"(optional)"}</label><input id="deliveryAddress" maxLength={240} value={draft.deliveryAddress} onChange={e=>change("deliveryAddress",e.target.value)}/></div>
  </div></section>
  <section className="buyer-panel"><h2>3. Additional instructions</h2><div className="buyer-field"><label htmlFor="request-notes">Notes for SmartHub Operations</label><textarea id="request-notes" maxLength={2000} value={draft.notes} onChange={e=>change("notes",e.target.value)}/></div><p className="buyer-muted">Submitting requests an assessment. It does not confirm available stock, a quote, a delivery date or a payment obligation. Document upload is not enabled until private-file policy is approved.</p></section>
  <div className="request-actions"><button className="action action-outline" type="submit" value="draft" disabled={busy}>{busy?"Saving…":mode==="clarification"?"Save response draft":"Save draft"}</button><button className="action action-primary" type="submit" value="submit" disabled={busy||!profileReady}>{busy?"Working…":mode==="clarification"?"Submit information":"Submit sourcing request"}</button></div>
  {!profileReady&&<p className="buyer-note">Your business profile is missing required information. <a href="/dashboard/settings">Complete the business profile</a> before submitting; independent verification is not a universal requirement for initial requests.</p>}
  {error&&<p className="agro-error" role="alert">{error}</p>}{notice&&<p className="agro-success" role="status">{notice}</p>}
 </form>;
}
