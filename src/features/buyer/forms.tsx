"use client";
import {useRouter} from "next/navigation";
import {useState,type FormEvent,type ReactNode} from "react";
import {NIGERIA_STATES} from "@/features/auth/auth-rules";

type Profile={businessName:string|null;businessType:string|null;registrationNumber:string|null;contactName:string|null;contactEmail:string|null;contactPhone:string|null;state:string|null;city:string|null;addressLine:string|null;preferredContactMethod:string;updatedAt:Date};
type CatalogOption={id:string;name:string};
function Field({name,label,children,required=false,defaultValue="",type="text"}:{name:string;label:string;children?:ReactNode;required?:boolean;defaultValue?:string;type?:string}){return <div className="buyer-field"><label htmlFor={name}>{label}{required?" *":""}</label>{children??<input id={name} name={name} type={type} defaultValue={defaultValue} required={required}/>}</div>}
function StateSelect({name="state",initial="",optional=false}:{name?:string;initial?:string;optional?:boolean}){return <select id={name} name={name} defaultValue={initial} required={!optional}><option value="">{optional?"Not selected":"Select state / FCT"}</option>{NIGERIA_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select>}
function ApiForm({endpoint,children,submitLabel,method="POST",onSuccess}:{endpoint:string;children:ReactNode;submitLabel:string;method?:"POST"|"DELETE";onSuccess?:()=>void}){
 const router=useRouter();const[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;const values=Object.fromEntries(new FormData(event.currentTarget));setBusy(true);setError("");setSuccess("");
  try{const response=await fetch(endpoint,{method,credentials:"same-origin",cache:"no-store",headers:method==="POST"?{"Content-Type":"application/json"}:undefined,body:method==="POST"?JSON.stringify(values):undefined});
   const data=await response.json().catch(()=>({error:"Unexpected response."}));if(!response.ok||!data.ok){setError(data.error||"Unable to save. Try again.");return;}
   setSuccess("Saved successfully.");onSuccess?.();router.refresh();
  }catch{setError("Connection lost. Your entries remain in the form; please retry.");}finally{setBusy(false);}
 }
 return <form className="buyer-form" onSubmit={submit}><div className="buyer-form-grid">{children}</div><div className="buyer-form-actions"><button className="action action-primary" type="submit" disabled={busy}>{busy?"Saving…":submitLabel}</button></div>{error&&<p role="alert" className="agro-error">{error}</p>}{success&&<p role="status" className="agro-success">{success}</p>}</form>;
}
export function BuyerProfileForm({profile}:{profile:Profile|null}){return <ApiForm endpoint="/api/buyer/profile" submitLabel={profile?"Save business profile":"Create business profile"}>
 <input type="hidden" name="expectedUpdatedAt" value={profile?.updatedAt.toISOString()??""}/>
 <Field name="businessName" label="Business or trading name" defaultValue={profile?.businessName??""}/>
 <Field name="businessType" label="Business type"><select id="businessType" name="businessType" defaultValue={profile?.businessType??""}><option value="">Select type</option><option value="REGISTERED_COMPANY">Registered company</option><option value="SOLE_PROPRIETORSHIP">Sole proprietor</option><option value="COOPERATIVE">Cooperative</option><option value="PARTNERSHIP">Partnership</option><option value="OTHER">Other</option></select></Field>
 <Field name="registrationNumber" label="Registration number (if applicable)" defaultValue={profile?.registrationNumber??""}/>
 <Field name="contactName" label="Primary business contact" defaultValue={profile?.contactName??""}/>
 <Field name="contactEmail" label="Business contact email" type="email" defaultValue={profile?.contactEmail??""}/>
 <Field name="contactPhone" label="Business contact phone" type="tel" defaultValue={profile?.contactPhone??""}/>
 <Field name="state" label="State / FCT"><StateSelect initial={profile?.state??""} optional/></Field>
 <Field name="city" label="City / LGA" defaultValue={profile?.city??""}/>
 <Field name="addressLine" label="Business address (optional)" defaultValue={profile?.addressLine??""}/>
 <Field name="preferredContactMethod" label="Preferred contact method"><select id="preferredContactMethod" name="preferredContactMethod" defaultValue={profile?.preferredContactMethod??"EMAIL"}><option value="EMAIL">Email</option><option value="PHONE">Phone</option><option value="WHATSAPP">WhatsApp</option></select></Field>
 </ApiForm>}
export function BuyerDestinationForm(){return <ApiForm endpoint="/api/buyer/destinations" submitLabel="Add delivery destination">
 <Field name="label" label="Destination label" required/><Field name="state" label="State / FCT" required><StateSelect/></Field>
 <Field name="city" label="City / LGA" required/><Field name="addressLine" label="Delivery address" required/>
 <Field name="contactName" label="Receiving contact (optional)"/><Field name="contactPhone" label="Receiving phone (optional)" type="tel"/>
 </ApiForm>}
export function BuyerSpecificationForm({commodity,types,specifications}:{commodity:CatalogOption;types:CatalogOption[];specifications:CatalogOption[]}){
 return <ApiForm endpoint="/api/buyer/specifications" submitLabel="Save sourcing template">
 <input type="hidden" name="commodityId" value={commodity.id}/><Field name="label" label="Template name" required defaultValue={`${commodity.name} sourcing`}/>
 <Field name="typeId" label="Commodity type"><select id="typeId" name="typeId" defaultValue=""><option value="">Not specified</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
 <Field name="specificationId" label="Requested specification"><select id="specificationId" name="specificationId" defaultValue=""><option value="">To be discussed</option>{specifications.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
 <Field name="quantity" label="Indicative requirement quantity" type="number" required><input id="quantity" name="quantity" type="number" min="0.001" step="0.001" required/></Field>
 <Field name="unit" label="Unit" required><select id="unit" name="unit" required><option value="KG">Kilograms</option><option value="TONNE">Metric tonnes</option><option value="BAG">Bags</option><option value="PIECE">Pieces</option></select></Field>
 <Field name="deliveryState" label="Preferred delivery state"><StateSelect name="deliveryState" optional/></Field>
 <Field name="notes" label="Requirement notes"><textarea id="notes" name="notes" maxLength={1000}/></Field>
 </ApiForm>
}
export function BuyerDeleteButton({endpoint,label}:{endpoint:string;label:string}){
 const router=useRouter();const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function remove(){if(busy||!window.confirm(`Remove ${label}?`))return;setBusy(true);setError("");try{const response=await fetch(endpoint,{method:"DELETE",credentials:"same-origin",cache:"no-store"});const data=await response.json().catch(()=>({error:"Unexpected response."}));if(!response.ok||!data.ok)throw new Error(data.error||"Unable to remove.");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Unable to remove.");}finally{setBusy(false);}}
 return <div><button type="button" className="buyer-delete" onClick={remove} disabled={busy}>{busy?"Removing…":"Remove"}</button>{error&&<p role="alert" className="agro-error">{error}</p>}</div>;
}
