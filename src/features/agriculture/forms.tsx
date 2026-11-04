"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NIGERIA_STATES } from "@/features/auth/auth-rules";

type Item={id:string;name:string};
type CropItem={id:string;name:string;farmId:string;commodityId:string};
type FieldProps={name:string;label:string;required?:boolean;children?:ReactNode;defaultValue?:string;type?:string;hint?:string};
function Field({name,label,required=false,children,defaultValue="",type="text",hint}:FieldProps){return <div className="agro-field"><label htmlFor={name}>{label}{required?" *":""}</label>{children||<input id={name} name={name} type={type} step={type==="number"?"0.001":undefined} defaultValue={defaultValue} required={required} />}{hint&&<p className="agro-hint">{hint}</p>}</div>}
function Select({name,values,required=true,initial=""}:{name:string;values:Item[];required?:boolean;initial?:string}){return <select id={name} name={name} required={required} defaultValue={initial}><option value="">Select an option</option>{values.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>}
const UNIT=[{id:"KG",name:"Kilograms (kg)"},{id:"TONNE",name:"Metric tonnes"},{id:"BAG",name:"Bags — specify packaging"},{id:"PIECE",name:"Pieces"}];
function SubmitForm({endpoint,method="POST",children,buttons}:{endpoint:string;method?:"POST"|"PATCH";children:ReactNode;buttons?:ReactNode}){
 const router=useRouter();const[busy,setBusy]=useState(false);const[error,setError]=useState("");const[success,setSuccess]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault(); if(busy)return;
  const form=new FormData(e.currentTarget);const clicked=(e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
  if(clicked?.name)form.set(clicked.name,clicked.value);
  if(clicked?.name==="action"&&clicked.value==="submit"&&!window.confirm("Submit this physical supply declaration to SmartHub Operations for review?"))return;
  const values=Object.fromEntries(form.entries());setBusy(true);setError("");setSuccess("");
  try{const res=await fetch(endpoint,{method,headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(values),cache:"no-store"});
   const body=await res.json().catch(()=>({error:"Unexpected server response."}));
   if(!res.ok||!body.ok){setError(body.error||"Unable to save this record. Try again.");return;}
   setSuccess("Saved successfully. Opening the next step…");
   if(body.next){router.push(body.next);router.refresh();}else{router.refresh();}
  }catch{setError("Connection failed. Your entries are still in the form; please try again.");}
  finally{setBusy(false);}
 }
 return <form className="agro-panel agro-form" onSubmit={submit}><div className="agro-form-grid">{children}</div><div className="agro-actions">{buttons??<button className="agro-button" type="submit" disabled={busy}>{busy?"Saving…":"Save"}</button>}</div>
 {error&&<p role="alert" className="agro-error">{error}</p>}{success&&<p role="status" className="agro-success">{success}</p>}
 </form>;
}
export function FarmForm({farm}:{farm?:{id:string;name:string;state:string;lga:string;community:string|null;locationNote:string|null}}){return <SubmitForm endpoint={farm?`/api/farmer/farms/${farm.id}`:"/api/farmer/farms"} method={farm?"PATCH":"POST"}>
 <Field name="name" label="Farm name" required defaultValue={farm?.name}/>
 <Field name="state" label="State / FCT" required><Select name="state" initial={farm?.state} values={NIGERIA_STATES.map(s=>({id:s,name:s}))}/></Field>
 <Field name="lga" label="Local government area" required defaultValue={farm?.lga}/>
 <Field name="community" label="Community / town" defaultValue={farm?.community||""}/>
 <Field name="locationNote" label="Location notes" defaultValue={farm?.locationNote||""} hint="Farm location is private and visible only to authorized SmartHub staff."/>
 </SubmitForm>}
export function VerificationSubmit({eligible}:{eligible:boolean}){
 const router=useRouter();const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function send(){setBusy(true);setError("");try{const r=await fetch("/api/farmer/verification",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not submit verification.");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Could not submit verification.");}finally{setBusy(false)}}
 return <div className="agro-panel"><h2>Submit farm profile for verification</h2><p>SmartHub Operations will review your submitted farm details. Submission is not approval.</p><button className="agro-button" type="button" disabled={!eligible||busy} onClick={send}>{busy?"Submitting…":"Submit for verification"}</button>{!eligible&&<p className="agro-hint">Add your farm before submitting.</p>}{error&&<p role="alert" className="agro-error">{error}</p>}</div>
}
export type CropFormData={farmId:string;commodityId:string;variety:string;stage:"PLANNED"|"GROWING"|"HARVESTED"|"INACTIVE";plantingDate:string;expectedHarvestAt:string;estimatedQuantity:string;estimatedUnit:string;notes:string;updatedAt:string};
export function CropForm({farms,commodities,id,record}:{farms:Item[];commodities:Item[];id?:string;record?:CropFormData}){
 return <SubmitForm endpoint={id?`/api/farmer/crops/${id}`:"/api/farmer/crops"} method={id?"PATCH":"POST"} buttons={<><button className="agro-button" type="submit">{id?"Save Crop Changes":"Save Crop"}</button><Link className="action action-outline" href={id?`/farmer/my-supply/crops/${id}`:"/farmer/my-supply/crops"}>Cancel</Link></>}>
 {id?<><input type="hidden" name="updatedAt" value={record?.updatedAt||""}/><p className="agro-hint">The crop's original farm and commodity are retained to protect linked supply records.</p></>:<>
 <Field name="farmId" label="Farm" required><Select name="farmId" values={farms}/></Field>
 <Field name="commodityId" label="Crop / commodity" required><Select name="commodityId" values={commodities}/></Field>
 </>}
 <Field name="variety" label="Variety (optional)" defaultValue={record?.variety}/>
 <Field name="stage" label="Crop stage" required><Select name="stage" initial={record?.stage||"GROWING"} values={[{id:"PLANNED",name:"Planned"},{id:"GROWING",name:"Growing"},{id:"HARVESTED",name:"Harvested"},{id:"INACTIVE",name:"No longer active"}]}/></Field>
 <Field name="plantingDate" label="Planting date" type="date" defaultValue={record?.plantingDate}/>
 <Field name="expectedHarvestAt" label="Expected harvest date" type="date" defaultValue={record?.expectedHarvestAt}/>
 <Field name="estimatedQuantity" label="Estimated harvest quantity" type="number" defaultValue={record?.estimatedQuantity} hint="This is your estimate, not verified physical stock."/>
 <Field name="estimatedUnit" label="Estimated unit"><Select name="estimatedUnit" initial={record?.estimatedUnit} required={false} values={UNIT}/></Field>
 <Field name="notes" label="Crop notes" defaultValue={record?.notes}/>
 </SubmitForm>
}
export type SupplyFormData={farmId:string;commodityId:string;cropId:string;variety:string;quantity:string;unit:string;packaging:string;harvestDate:string;reportedCondition:string;storageNote:string;notes:string};
export function SupplyForm({farms,commodities,crops,record,id}:{farms:Item[];commodities:Item[];crops:CropItem[];record?:SupplyFormData;id?:string}){
 const [farmId,setFarmId]=useState(record?.farmId||"");
 const [commodityId,setCommodityId]=useState(record?.commodityId||"");
 const [cropId,setCropId]=useState(record?.cropId||"");
 const availableCrops=crops.filter(c=>c.farmId===farmId&&c.commodityId===commodityId);
 return <><div className="agro-alert">Only declare produce that physically exists and is currently available. Estimated future harvests are recorded as crops, not stock. Your declaration is farmer-reported until reviewed.</div>
 <SubmitForm endpoint={id?`/api/farmer/supplies/${id}`:"/api/farmer/supplies"} method={id?"PATCH":"POST"} buttons={<><button className="agro-button agro-secondary" type="submit" name="action" value="draft">Save draft</button><button className="agro-button" type="submit" name="action" value="submit">Submit for review</button><Link href="/farmer/my-supply/available" className="action action-outline">Cancel</Link></>}>
 <Field name="farmId" label="Farm / supply location" required><select id="farmId" name="farmId" required value={farmId} onChange={e=>{setFarmId(e.target.value);setCropId("");}}><option value="">Select a farm</option>{farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
 <Field name="commodityId" label="Commodity" required><select id="commodityId" name="commodityId" required value={commodityId} onChange={e=>{setCommodityId(e.target.value);setCropId("");}}><option value="">Select a commodity</option>{commodities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
 <Field name="cropId" label="Source crop (optional)"><select id="cropId" name="cropId" value={cropId} onChange={e=>setCropId(e.target.value)}><option value="">Existing stock / no crop record</option>{availableCrops.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
 <Field name="variety" label="Variety" defaultValue={record?.variety}/>
 <Field name="quantity" label="Physical quantity available" type="number" required defaultValue={record?.quantity} hint="Choose a consistent unit. Bags must have a clearly described package size."/>
 <Field name="unit" label="Unit" required><Select name="unit" initial={record?.unit} values={UNIT}/></Field>
 <Field name="packaging" label="Packaging (e.g. net kg per bag)" defaultValue={record?.packaging}/>
 <Field name="harvestDate" label="Harvest date (if known)" type="date" defaultValue={record?.harvestDate}/>
 <Field name="reportedCondition" label="Produce condition (farmer reported)" required defaultValue={record?.reportedCondition}/>
 <Field name="storageNote" label="Storage / handling notes" defaultValue={record?.storageNote}/>
 <Field name="notes" label="Additional information" defaultValue={record?.notes}/>
 </SubmitForm></>
}
export function WithdrawSupplyForm({id}:{id:string}){
 const router=useRouter();const[reason,setReason]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function withdraw(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||reason.trim().length<5)return;
  if(!window.confirm("Withdraw this supply declaration? This action cannot be undone by the farmer."))return;
  setBusy(true);setError("");
  try{const r=await fetch(`/api/farmer/supplies/${id}/withdraw`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason})});
   const data=await r.json().catch(()=>({error:"Unexpected server response."}));
   if(!r.ok||!data.ok){setError(data.error||"Unable to withdraw the supply record.");return;}
   router.push(data.next||`/farmer/my-supply/available/${id}`);router.refresh();
  }catch{setError("Connection failed. Please retry; the current status has not been confirmed.");}finally{setBusy(false);}
 }
 return <form className="agro-panel agro-form" onSubmit={withdraw}><h2>Withdraw this declaration</h2><p>Only drafts and pending-review declarations can be withdrawn here. Approved supply requires an Operations review.</p><Field name="withdrawalReason" label="Reason for withdrawal" required><textarea id="withdrawalReason" name="withdrawalReason" required minLength={5} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} /></Field><button type="submit" className="agro-button agro-secondary" disabled={busy||reason.trim().length<5}>{busy?"Withdrawing…":"Withdraw declaration"}</button>{error&&<p role="alert" className="agro-error">{error}</p>}</form>;
}
export function ReviewForm({kind,id}:{kind:"verification"|"supply";id:string}){
 return <><div className="agro-alert">Confirm evidence and eligibility before approval. This decision does not create orders, reserve quantities or publish a listing.</div>
 <SubmitForm endpoint={`/api/operations/reviews/${kind}/${id}`} buttons={<><button type="submit" className="agro-button" name="decision" value="approve">Approve</button><button type="submit" className="agro-button agro-secondary" name="decision" value="more_info">Request information</button><button type="submit" className="agro-button agro-secondary" name="decision" value="reject">Reject</button></>}>
 <Field name="note" label="Reason / review note" hint="Record a clear review rationale (at least five characters) for every decision."/>
 </SubmitForm></>
}
export function CommodityForm(){return <SubmitForm endpoint="/api/operations/commodities"><Field name="name" label="Official commodity name" required/></SubmitForm>}
