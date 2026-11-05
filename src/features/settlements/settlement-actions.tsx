"use client";
import {useRouter} from "next/navigation";
import {useState,type FormEvent} from "react";

async function send(path:string,payload:unknown){
 const response=await fetch(path,{method:"POST",credentials:"same-origin",cache:"no-store",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const data=await response.json().catch(()=>({error:"The server returned an invalid response."}));
 if(!response.ok||!data.ok)throw new Error(data.error||"No change was confirmed.");
 return data as {id?:string;status?:string;version?:number};
}
export function BankDetailsForm({banks}:{banks:{code:string;name:string}[]}){
 const router=useRouter();const[bankCode,setBankCode]=useState(""),[accountNumber,setNumber]=useState(""),[attestation,setAttestation]=useState(false);
 const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");
  try{await send("/api/farmer/settlements/bank",{bankCode,accountNumber,attestation});router.refresh();setNumber("");setAttestation(false);}
  catch(e){setError(e instanceof Error?e.message:"Bank verification could not be confirmed.");}finally{setBusy(false);}
 }
 return <form className="agro-panel agro-field" onSubmit={submit}><h2>Verify your Nigerian bank account</h2>
 <p>Account ownership will be checked directly with Paystack. The number is encrypted on the server; only its final four digits appear in your workspace. Updating an approved beneficiary is blocked during financial processing.</p>
 <label htmlFor="bank-code">Choose bank or enter its Paystack code *</label>
 {banks.length?<select id="bank-code" required value={bankCode} onChange={e=>setBankCode(e.target.value)}><option value="">Select your bank</option>{banks.map(b=><option key={b.code} value={b.code}>{b.name}</option>)}</select>:<input id="bank-code" inputMode="numeric" pattern="[0-9]{3,12}" required value={bankCode} onChange={e=>setBankCode(e.target.value)} placeholder="Paystack bank code" />}
 <label htmlFor="account-number">Your 10-digit bank account number *</label><input id="account-number" type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{10}" maxLength={10} required value={accountNumber} onChange={e=>setNumber(e.target.value)}/>
 <label><input type="checkbox" checked={attestation} onChange={e=>setAttestation(e.target.checked)}/> I confirm that this bank account belongs to me and is authorized to receive SmartHub farmer payments.</label>
 <button type="submit" className="agro-button" disabled={busy||!attestation||!bankCode||!/^\d{10}$/.test(accountNumber)}>{busy?"Checking with bank provider…":"Verify and save bank details"}</button>
 {error&&<p role="alert" className="agro-error">{error}</p>}</form>;
}
export function SupplierDecisionForm({id,version}:{id:string;version:number}){
 const router=useRouter();const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function decide(action:"accept"|"decline"){
  if(busy||!window.confirm(action==="accept"?"I accept this exact farmer unit price and supply quantity.":"I decline the proposed supplier terms."))return;
  setBusy(true);setError("");
  try{await send("/api/farmer/settlements/agreements/"+id+"/decision",{action,expectedVersion:version,attestation:true});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Your decision was not recorded.");}finally{setBusy(false);}
 }
 return <div className="agro-field"><div className="agro-actions"><button type="button" className="agro-button" disabled={busy} onClick={()=>void decide("accept")}>Accept offered supply terms</button>
 <button type="button" className="action action-outline" disabled={busy} onClick={()=>void decide("decline")}>Decline offer</button></div>
 {error&&<p role="alert" className="agro-error">{error}</p>}</div>;
}
export function ProposeSupplierPrice({orderLineId}:{orderLineId:string}){
 const router=useRouter();const[unitPriceNgn,setPrice]=useState(""),[note,setNote]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");
  try{await send("/api/operations/settlements/terms",{orderLineId,unitPriceNgn,note});router.refresh();setPrice("");setNote("");}
  catch(e){setError(e instanceof Error?e.message:"Farmer offer was not created.");}finally{setBusy(false);}
 }
 return <form className="agro-field" onSubmit={submit}><h3>Propose farmer-specific commercial terms</h3><p>This price is independent of the buyer quotation. The farmer must explicitly accept it; this proposal does not trigger payment.</p>
 <label>Farmer price in ₦ per agreed commodity unit *</label><input type="text" inputMode="decimal" required value={unitPriceNgn} onChange={e=>setPrice(e.target.value)} placeholder="e.g. 450.00"/>
 <label>Source, negotiated agreement and conditions *</label><textarea minLength={15} maxLength={2000} required value={note} onChange={e=>setNote(e.target.value)}/>
 <button className="action action-outline" type="submit" disabled={busy||note.trim().length<15||!unitPriceNgn}>{busy?"Saving offer…":"Submit for farmer acceptance"}</button>
 {error&&<p role="alert" className="agro-error">{error}</p>}</form>;
}
export function CreatePayableAction({agreementId}:{agreementId:string}){
 const router=useRouter();const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function create(){setBusy(true);setError("");
  try{await send("/api/operations/settlements/agreements/"+agreementId+"/obligation",{});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Payable could not be created.");}finally{setBusy(false);}
 }
 return <div className="agro-field"><button className="action action-outline" type="button" disabled={busy} onClick={()=>void create()}>{busy?"Reconciling receipts…":"Prepare farmer payable from accepted receipt"}</button>
 {error&&<p role="alert" className="agro-error">{error}</p>}</div>;
}
export function ApprovePayableForm({id}:{id:string}){
 const router=useRouter();const[reason,setReason]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!window.confirm("Independently approve the exact payable and verified farmer bank? This is NOT transfer confirmation."))return;setBusy(true);setError("");
  try{await send("/api/admin/settlements/"+id+"/approve",{decision:"approve",reason});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Approval failed.");}finally{setBusy(false);}
 }
 return <form className="agro-field" onSubmit={submit}><label>Reason for independent finance approval *</label><textarea required minLength={20} maxLength={1500} value={reason} onChange={e=>setReason(e.target.value)}/>
 <button type="submit" className="agro-button" disabled={busy||reason.trim().length<20}>{busy?"Approving…":"Approve supplier obligation"}</button>{error&&<p className="agro-error" role="alert">{error}</p>}</form>;
}
export function ExecutePayout({id,enabled}:{id:string;enabled:boolean}){
 const router=useRouter();const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function start(){if(!enabled||busy||!window.confirm("THIS CAN SEND REAL MONEY. Submit this exact independently approved farmer payable to Paystack? Any uncertain response must be reconciled; never resend blindly."))return;
  setBusy(true);setError("");
  try{await send("/api/operations/settlements/"+id+"/transfer",{confirmation:true});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Payout status is not confirmed. Verify provider record; do not retry.");}finally{setBusy(false);}
 }
 return <div className="agro-field"><button className="agro-button" type="button" disabled={!enabled||busy} onClick={()=>void start()}>{busy?"Submitting to provider…":"Submit approved farmer transfer"}</button>
 {!enabled&&<p className="agro-hint">Live transfers are disabled until merchant onboarding, payout rules, financial reconciliation and staging acceptance are approved.</p>}
 {error&&<p role="alert" className="agro-error">{error}</p>}</div>;
}
export function ReconcilePayout({id,role}:{id:string;role:"operations"|"admin"}){
 const router=useRouter();const[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 async function reconcile(){setBusy(true);setError("");setNotice("");
  try{const path=role==="admin"?"/api/admin/settlements/attempts/"+id+"/reconcile":"/api/operations/settlements/attempts/"+id+"/reconcile";
   const data=await send(path,{});setNotice("Direct Paystack result: "+(data.status??"unknown"));router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Provider check could not be completed.");}finally{setBusy(false);}
 }
 return <div className="agro-field"><button type="button" className="action action-outline" disabled={busy} onClick={()=>void reconcile()}>{busy?"Checking provider…":"Verify outward transfer with Paystack"}</button>
 {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="agro-error">{error}</p>}</div>;
}
