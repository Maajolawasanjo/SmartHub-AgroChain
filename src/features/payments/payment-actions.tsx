"use client";
import {useRouter} from "next/navigation";
import {useState,type FormEvent} from "react";

async function post(path:string,payload:unknown){
 const response=await fetch(path,{method:"POST",cache:"no-store",credentials:"same-origin",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const result=await response.json().catch(()=>({error:"The payment service returned an invalid response."}));
 if(!response.ok||!result.ok)throw new Error(result.error||"Your request could not be completed.");
 return result as {ok:true;status:string;attemptId?:string;checkoutUrl?:string|null;id?:string};
}
export function StartPayment({orderId,canPay}:{orderId:string;canPay:boolean}){
 const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function start(){
  if(busy||!canPay||!window.confirm("Proceed to secure Paystack checkout? Amount and order are verified by SmartHub on the server."))return;
  setBusy(true);setError("");
  try{
   const result=await post("/api/buyer/payments/checkout",{orderId});
   if(result.status!=="READY"||!result.checkoutUrl){throw new Error("Checkout is not ready. Review your payment status before retrying.");}
   const target=new URL(result.checkoutUrl);
   if(target.protocol!=="https:"||target.hostname!=="checkout.paystack.com")throw new Error("The checkout domain was not approved.");
   window.location.assign(result.checkoutUrl);
  }catch(e){setError(e instanceof Error?e.message:"Checkout could not be started.");setBusy(false);}
 }
 return <section className="buyer-panel"><h2>Secure buyer payment</h2>
 <p>SmartHub calculates your NGN total from the approved order. Your browser cannot set the amount or mark an order paid. You will be directed to Paystack only when payment services are configured and your order still has active stock reservations.</p>
 <button type="button" className="action action-primary" disabled={busy||!canPay} onClick={()=>void start()}>{busy?"Opening secure checkout…":"Proceed to Paystack checkout"}</button>
 {!canPay&&<p className="buyer-note">This order is not eligible for checkout. Review its status and reservation deadline.</p>}
 {error&&<p role="alert" className="agro-error">{error}</p>}
 </section>;
}
export function VerifyPayment({id,role}:{id:string;role:"buyer"|"operations"}){
 const router=useRouter();const[busy,setBusy]=useState(false);const[error,setError]=useState("");const[result,setResult]=useState("");
 async function verify(){
  if(busy)return;
  setBusy(true);setError("");setResult("");
  try{
   const path=role==="buyer"?"/api/buyer/payments/"+id+"/verify":"/api/operations/payments/"+id+"/reconcile";
   const response=await post(path,{});
   setResult("Verified provider result: "+response.status.replaceAll("_"," ").toLowerCase());
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not verify payment.");}finally{setBusy(false);}
 }
 return <div className="agro-field"><button className="action action-outline" type="button" disabled={busy} onClick={()=>void verify()}>{busy?"Checking with Paystack…":"Check Paystack status securely"}</button>
 {result&&<p role="status">{result}. Refresh for updated order status.</p>}
 {error&&<p className="agro-error" role="alert">{error}</p>}
 </div>;
}
export function RefundRequestForm({obligationId}:{obligationId:string}){
 const router=useRouter();const[reason,setReason]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function send(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;
  setBusy(true);setError("");
  try{await post("/api/buyer/payments/refunds",{obligationId,reason});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Unable to submit review request.");}finally{setBusy(false);}
 }
 return <form className="buyer-panel" onSubmit={send}><h2>Request a refund review</h2><p>This submits a case to SmartHub; it does not automatically refund a Paystack transaction. Refund eligibility, evidence and provider status must be reviewed separately.</p>
 <label htmlFor="refund-reason">Reason for requesting review *</label>
 <textarea id="refund-reason" required minLength={15} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Describe the issue and what resolution you are requesting."/>
 <button className="action action-outline" type="submit" disabled={busy||reason.trim().length<15}>{busy?"Submitting…":"Submit refund review request"}</button>
 {error&&<p role="alert" className="agro-error">{error}</p>}</form>;
}
export function RefundReviewForm({id}:{id:string}){
 const router=useRouter();const[note,setNote]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function decide(action:"UNDER_REVIEW"|"REJECTED"|"RESOLUTION_REQUIRED"){
  if(busy||!window.confirm("Record "+action.replaceAll("_"," ").toLowerCase()+"? This does not issue funds."))return;
  setBusy(true);setError("");
  try{await post("/api/admin/payments/refunds/"+id+"/review",{action,note});router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Review action failed.");}finally{setBusy(false);}
 }
 return <div className="agro-field"><label>Review rationale / required next steps *</label><textarea minLength={20} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} />
 <div className="agro-actions">{[["UNDER_REVIEW","Under review"],["REJECTED","Reject case"],["RESOLUTION_REQUIRED","Escalate for provider resolution"]].map(([value,label])=><button key={value} type="button" className="action action-outline" disabled={busy||note.trim().length<20} onClick={()=>void decide(value as "UNDER_REVIEW"|"REJECTED"|"RESOLUTION_REQUIRED")}>{label}</button>)}</div>
 {error&&<p className="agro-error" role="alert">{error}</p>}
 </div>;
}
