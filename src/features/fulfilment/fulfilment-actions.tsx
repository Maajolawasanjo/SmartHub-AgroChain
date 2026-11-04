"use client";
import {useRouter} from "next/navigation";
import {useState,type FormEvent} from "react";

async function send(path:string,value:unknown){
 const res=await fetch(path,{method:"POST",credentials:"same-origin",cache:"no-store",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
 const data=await res.json().catch(()=>({error:"Invalid server response."}));
 if(!res.ok||!data.ok)throw new Error(data.error||"The action was not confirmed.");
 return data as {id:string;status:string;reference?:string};
}
export function PlanForm({orderId,preset}:{orderId:string;preset:{state:string;city:string;address:string;method:string}}){
 const router=useRouter();const[state,setState]=useState(preset.state),[city,setCity]=useState(preset.city),[address,setAddress]=useState(preset.address),[handlingNote,setNote]=useState("");
 const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");
  try{await send("/api/operations/fulfilment/plans",{orderId,destinationState:state,destinationCity:city,destinationAddress:address,handlingNote});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Plan not saved.");}finally{setBusy(false);}
 }
 const fixed=preset.method!=="BUYER_PICKUP";
 return <form className="agro-panel agro-field" onSubmit={submit}><h2>Prepare fulfilment plan</h2>
 <p>Confirmed procurement method: {preset.method.replaceAll("_"," ")}. For delivery and third-party arrangements, the buyer-confirmed destination cannot be modified by Operations.</p>
 <label>State</label><input value={state} readOnly={fixed} minLength={2} maxLength={60} required onChange={e=>setState(e.target.value)}/>
 <label>City</label><input value={city} readOnly={fixed} minLength={2} maxLength={120} required onChange={e=>setCity(e.target.value)}/>
 <label>Delivery / agreed pickup address</label><textarea value={address} readOnly={fixed} minLength={8} maxLength={240} required onChange={e=>setAddress(e.target.value)}/>
 <label>Handling notes (not buyer contract changes)</label><textarea maxLength={1000} value={handlingNote} onChange={e=>setNote(e.target.value)}/>
 <button type="submit" className="agro-button" disabled={busy}>Create inspected-supply fulfilment plan</button>
 {error&&<p className="agro-error" role="alert">{error}</p>}</form>;
}
type AvailableLine={id:string;label:string;unit:string;available:string};
export function ShipmentForm({planId,lines}:{planId:string;lines:AvailableLine[]}){
 const router=useRouter();const[carrierName,setCarrier]=useState(""),[carrierContact,setContact]=useState("");
 const[vehicleNote,setVehicle]=useState(""),[trackingReference,setTracking]=useState("");
 const[quantities,setQuantities]=useState<Record<string,string>>({});
 const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");
  const picked=lines.filter(l=>quantities[l.id]&&Number(quantities[l.id])>0).map(l=>({orderLineId:l.id,quantity:quantities[l.id]}));
  try{const saved=await send("/api/operations/fulfilment/shipments",{planId,carrierName,carrierContact,vehicleNote,trackingReference,lines:picked});router.push("/operations/fulfilment/shipments/"+saved.id);router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Shipment not created.");}finally{setBusy(false);}
 }
 if(!lines.length)return <p className="agro-hint">All purchased quantities have already been allocated across planned or received shipments. No additional shipment can be created.</p>;
 return <form className="agro-panel agro-field" onSubmit={submit}><h2>Prepare a split shipment</h2><p>Specify actual quantities for this shipment; combined planned quantities may never exceed accepted order lines. No dispatch is recorded until evidence is uploaded.</p>
 <label>Carrier or collection contact *</label><input required minLength={2} maxLength={160} value={carrierName} onChange={e=>setCarrier(e.target.value)}/>
 <label>Private carrier phone or reference</label><input maxLength={80} value={carrierContact} onChange={e=>setContact(e.target.value)}/>
 <label>Vehicle details</label><input maxLength={160} value={vehicleNote} onChange={e=>setVehicle(e.target.value)}/>
 <label>Optional carrier tracking number</label><input maxLength={120} value={trackingReference} onChange={e=>setTracking(e.target.value)}/>
 {lines.map(l=><div className="agro-field" key={l.id}><label>{l.label} · Remaining unallocated: {l.available} {l.unit}</label><input type="number" min="0" max={l.available} step="0.001" value={quantities[l.id]??""} onChange={e=>setQuantities(v=>({...v,[l.id]:e.target.value}))} placeholder="0 to omit line"/></div>)}
 <button className="agro-button" type="submit" disabled={busy}>Record planned shipment</button>
 {error&&<p className="agro-error" role="alert">{error}</p>}</form>;
}
export function EvidenceUploadForm({shipmentId}:{shipmentId:string}){
 const router=useRouter();const[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!file)return;setBusy(true);setError("");
  try{const data=new FormData();data.append("file",file);const response=await fetch("/api/shipments/"+shipmentId+"/evidence",{method:"POST",credentials:"same-origin",body:data});
   const payload=await response.json().catch(()=>({error:"Invalid evidence upload response."}));
   if(!response.ok||!payload.ok)throw new Error(payload.error||"Upload failed.");
   setFile(null);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Upload failed.");}finally{setBusy(false);}
 }
 return <form className="agro-panel agro-field" onSubmit={submit}><h2>Private shipment evidence</h2><p>Upload a real JPEG, PNG, WebP or PDF (up to 10 MB). Files are privately stored and visible only to authorized parties.</p>
 <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={e=>setFile(e.target.files?.[0]??null)}/>
 <button className="action action-outline" type="submit" disabled={busy||!file}>{busy?"Uploading proof…":"Attach documentary evidence"}</button>
 {error&&<p className="agro-error" role="alert">{error}</p>}</form>;
}
export function MilestoneForm({shipmentId,status,evidence}:{shipmentId:string;status:string;evidence:{id:string;name:string;used:boolean}[]}){
 const router=useRouter();const[note,setNote]=useState(""),[evidenceId,setEvidenceId]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const step=status==="PLANNED"?"pickup":status==="PICKED_UP"?"dispatch":status==="IN_TRANSIT"?"deliver":null;
 const unused=evidence.filter(e=>!e.used);
 async function submit(action:string){if(!window.confirm("Record "+action+" for this real shipment? This does not mark the order received or consume stock."))return;
  setBusy(true);setError("");
  try{await send("/api/operations/fulfilment/shipments/"+shipmentId+"/milestone",{action,note,...action==="cancel"?{}:{evidenceId}});router.refresh();setNote("");setEvidenceId("");}
  catch(e){setError(e instanceof Error?e.message:"Milestone was not recorded.");}finally{setBusy(false);}
 }
 return <section className="agro-panel agro-field"><h2>Controlled transport milestone</h2><p>Current shipment state: {status}. Real pickup, dispatch and arrival require a separate, unused evidence attachment. These events are not buyer receipt.</p>
 {step&&<><label>Ready, unused evidence</label><select value={evidenceId} onChange={e=>setEvidenceId(e.target.value)} required><option value="">Select evidence for this milestone</option>{unused.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></>}
 {(step||status==="PLANNED")&&<><label>Required operational note</label><textarea minLength={8} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/><div className="agro-actions">
 {step&&<button type="button" className="agro-button" disabled={busy||note.trim().length<8||!evidenceId} onClick={()=>void submit(step)}>Confirm {step}</button>}
 {status==="PLANNED"&&<button type="button" className="action action-outline" disabled={busy||note.trim().length<8} onClick={()=>void submit("cancel")}>Cancel uncollected shipment</button>}</div></>}
 {!step&&status!=="PLANNED"&&<p>No further Operations transport action is available for this shipment state.</p>}
 {error&&<p className="agro-error" role="alert">{error}</p>}</section>;
}
type ReceiptItem={id:string;label:string;quantity:string;unit:string};
export function BuyerReceiptForm({shipmentId,lines}:{shipmentId:string;lines:ReceiptItem[]}){
 const router=useRouter();const[amounts,setAmounts]=useState<Record<string,string>>({});
 const[note,setNote]=useState(""),[attestation,setAttestation]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const short=lines.some(l=>amounts[l.id]!==undefined&&amounts[l.id]!==""&&Number(amounts[l.id])<Number(l.quantity));
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy||!attestation)return;
  if(!window.confirm("Confirm these physically received quantities? Accepted goods will be permanently recorded as received; differences create an issue for review."))return;
  setBusy(true);setError("");
  try{await send("/api/buyer/shipments/"+shipmentId+"/receipt",{attestation:true,note,
   lines:lines.map(l=>({shipmentLineId:l.id,acceptedQuantity:amounts[l.id]}))});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Receipt was not confirmed.");}finally{setBusy(false);}
 }
 return <form className="buyer-panel" onSubmit={submit}><h2>Confirm physical receipt</h2><p>Check each item on arrival. Record exactly what you received, including zero. Missing quantities stay disputed and will not be counted as consumed.</p>
 {lines.map(l=><div className="agro-field" key={l.id}><label>{l.label} · Shipment contains {l.quantity} {l.unit} *</label>
 <input type="number" step="0.001" min="0" max={l.quantity} required value={amounts[l.id]??""} onChange={e=>setAmounts(v=>({...v,[l.id]:e.target.value}))}/></div>)}
 <div className="agro-field"><label>Arrival notes {short?"(required for any shortage)":"(optional)"}</label><textarea required={short} minLength={short?15:undefined} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></div>
 <label><input type="checkbox" checked={attestation} onChange={e=>setAttestation(e.target.checked)}/> I am the authorized buyer organization owner and confirm these quantities are physically received.</label>
 <button className="action action-primary" type="submit" disabled={busy||!attestation||lines.some(l=>amounts[l.id]===undefined||amounts[l.id]==="")}>{busy?"Recording receipt…":"Confirm received quantities"}</button>
 {error&&<p className="agro-error" role="alert">{error}</p>}</form>;
}
export function DeliveryIssueForm({shipmentId}:{shipmentId:string}){
 const router=useRouter();const[category,setCategory]=useState("SHORTAGE"),[description,setDescription]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");
  try{await send("/api/buyer/shipments/"+shipmentId+"/issue",{category,description});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Issue was not recorded.");}finally{setBusy(false);}
 }
 return <form className="buyer-panel" onSubmit={submit}><h2>Report a delivery problem</h2><p>Reporting a problem pauses fulfilment completion for investigation; it does not automatically refund or return sourced stock.</p>
 <label>Category</label><select value={category} onChange={e=>setCategory(e.target.value)}>{["SHORTAGE","DAMAGED","WRONG_ITEM","QUALITY","NOT_RECEIVED","OTHER"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select>
 <label>What happened? *</label><textarea minLength={15} maxLength={2000} required value={description} onChange={e=>setDescription(e.target.value)}/>
 <button type="submit" className="action action-outline" disabled={busy||description.trim().length<15}>{busy?"Reporting…":"Submit issue to SmartHub"}</button>
 {error&&<p className="agro-error" role="alert">{error}</p>}</form>;
}
export function IssueReviewForm({issueId}:{issueId:string}){
 const router=useRouter();const[note,setNote]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(action:string){setBusy(true);setError("");
  try{await send("/api/operations/fulfilment/issues/"+issueId+"/review",{action,note});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Review not recorded.");}finally{setBusy(false);}
 }
 return <div className="agro-field"><label>Detailed investigation note *</label><textarea minLength={20} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/>
 <div className="agro-actions">{[["UNDER_REVIEW","Begin investigation"],["RESOLUTION_REQUIRED","Escalate for documented resolution"]].map(([action,label])=><button key={action} type="button" className="action action-outline" disabled={busy||note.trim().length<20} onClick={()=>void submit(action)}>{label}</button>)}</div>
 {error&&<p className="agro-error" role="alert">{error}</p>}</div>;
}
