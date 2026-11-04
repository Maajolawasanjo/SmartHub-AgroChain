"use client";
import {useRouter} from "next/navigation";
import {useState,type FormEvent} from "react";
async function send(endpoint:string,body:unknown){
 const response=await fetch(endpoint,{method:"POST",credentials:"same-origin",cache:"no-store",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({error:"Unexpected response from server."}));
 if(!response.ok||!data.ok)throw new Error(data.error||"The operation could not be completed.");
 return data as {id:string;status:string;reference?:string};
}
export function LotIntakeForm({supplyId}:{supplyId:string}){
 const router=useRouter();const[locationNote,setLocationNote]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  try{await send("/api/operations/lots",{supplyId,locationNote});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Could not register physical lot.");}finally{setBusy(false);}
 }
 return <form className="agro-panel agro-field" onSubmit={submit}><h2>Register verified sourced lot</h2>
 <p>Quantity is derived on the server from the farmer declaration and latest accepted physical inspection. You cannot invent quantity or stock.</p>
 <label htmlFor="lot-location">Recorded physical location / custody context *</label>
 <input id="lot-location" maxLength={240} minLength={5} placeholder="e.g. Farmer-managed storage, named local area; confirm physical evidence" value={locationNote} onChange={e=>setLocationNote(e.target.value)} required/>
 <button className="agro-button" disabled={busy||locationNote.trim().length<5} type="submit">{busy?"Checking…":"Register verified sourced lot"}</button>
 {error&&<p className="agro-error" role="alert">{error}</p>}</form>;
}
export function LotStatusForm({id,status}:{id:string;status:"AVAILABLE"|"ON_HOLD"}){
 const router=useRouter();const[reason,setReason]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 const target=status==="AVAILABLE"?"ON_HOLD":"AVAILABLE";
 async function act(){
  if(busy||!window.confirm((target==="ON_HOLD"?"Place this lot on hold":"Reopen this lot for future sourcing")+"? Existing reservations will not automatically disappear."))return;
  setBusy(true);setError("");
  try{await send("/api/operations/lots/"+id+"/status",{status:target,reason});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Unable to update lot.");}finally{setBusy(false);}
 }
 return <div className="agro-field"><label>Reason for availability decision *</label><textarea minLength={10} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/>
 <button type="button" className="action action-outline" disabled={busy||reason.trim().length<10} onClick={()=>void act()}>{busy?"Saving…":target==="ON_HOLD"?"Hold new reservations":"Reopen sourced lot"}</button>
 {error&&<p className="agro-error" role="alert">{error}</p>}</div>;
}
export function OrderConversionForm({quotationId,expectedQuoteVersion}:{quotationId:string;expectedQuoteVersion:number}){
 const router=useRouter();const[holdExpiresAt,setHoldExpiresAt]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;
  if(!window.confirm("Create a pending-payment order and atomically reserve inspected physical supply? This does not confirm or collect payment."))return;
  setBusy(true);setError("");
  try{const data=await send("/api/operations/orders",{quotationId,expectedQuoteVersion,holdExpiresAt:new Date(holdExpiresAt).toISOString()});router.push("/operations/orders/"+data.id);router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"No pending order was confirmed.");}finally{setBusy(false);}
 }
 return <form className="agro-panel agro-field" onSubmit={submit}><h2>Convert accepted quotation to pending-payment order</h2>
 <p>This explicit Operations action checks current physical lots and holds quantity using a serializable database transaction. It does not produce an invoice, payment link, proof of payment or fulfilment confirmation.</p>
 <label htmlFor="lot-hold-expiry">Operations-approved reservation hold deadline *</label>
 <input id="lot-hold-expiry" type="datetime-local" value={holdExpiresAt} onChange={e=>setHoldExpiresAt(e.target.value)} required/>
 <p className="agro-hint">Specify a deadline between one hour and 14 days ahead. No automatic policy is implied; an authorized reviewer must explicitly release overdue holds until a scheduled process is implemented.</p>
 <button type="submit" className="agro-button" disabled={busy||!holdExpiresAt}>{busy?"Checking stock and recording order…":"Reserve inspected supply and create pending order"}</button>
 {error&&<p className="agro-error" role="alert">{error}</p>}</form>;
}
export function ReleaseOrderForm({id,version,holdExpired}:{id:string;version:number;holdExpired:boolean}){
 const router=useRouter();const[reason,setReason]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 const action=holdExpired?"expire":"cancel";
 async function release(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!window.confirm("Release all active holds and record "+action+" for this pending order?"))return;
  setBusy(true);setError("");
  try{await send("/api/operations/orders/"+id+"/release",{action,expectedVersion:version,reason});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Release was not confirmed; no change is assumed.");}finally{setBusy(false);}
 }
 return <form className="agro-panel agro-field" onSubmit={release}><h2>{holdExpired?"Expire overdue reservation":"Cancel pending order"}</h2>
 <p>Only unpaid, fully unconsumed reservations can be released. Consumed or already released stock cannot be silently restored.</p>
 <label htmlFor="order-release-reason">Recorded reason *</label><textarea id="order-release-reason" value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={2000} required/>
 <button className="agro-button" disabled={busy||reason.trim().length<10} type="submit">{busy?"Releasing…":holdExpired?"Expire and release reservation":"Cancel and release reservation"}</button>
 {error&&<p role="alert" className="agro-error">{error}</p>}</form>;
}
