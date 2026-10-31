"use client";
import {useRouter} from "next/navigation";
import {useState,type FormEvent,type ReactNode} from "react";
export function CatalogAction({action,children,submitLabel,initial={}}:{action:string;children:ReactNode;submitLabel:string;initial?:Record<string,unknown>}){
 const router=useRouter();const [pending,setPending]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(pending)return;setPending(true);setError("");setMessage("");const values=Object.fromEntries(new FormData(event.currentTarget).entries());
 try{const res=await fetch("/api/operations/catalog/manage",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({...initial,...values,action})});
 const data=await res.json().catch(()=>({error:"Unexpected server response."}));if(!res.ok||!data.ok)throw new Error(data.error||"Unable to save.");setMessage("Saved successfully.");router.refresh();
 }catch(e){setError(e instanceof Error?e.message:"Unable to save changes.");}finally{setPending(false);}}
 return <form className="agro-panel agro-form" onSubmit={submit}><div className="agro-form-grid">{children}</div><div className="agro-actions"><button type="submit" disabled={pending} className="agro-button">{pending?"Saving…":submitLabel}</button></div>{error&&<p className="agro-error" role="alert">{error}</p>}{message&&<p className="agro-success" role="status">{message}</p>}</form>;
}
export function PublicationAction({action,id,publish,label}:{action:"publish"|"publish-type"|"publish-spec"|"publish-insight";id:string;publish:boolean;label:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");const router=useRouter();
 async function run(){if(busy)return;setBusy(true);setError("");try{const payload=action==="publish"?{commodityId:id}:action==="publish-type"?{typeId:id}:action==="publish-spec"?{specId:id}:{articleId:id};
 const res=await fetch("/api/operations/catalog/manage",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action,publish,...payload})});
 const result=await res.json();if(!res.ok||!result.ok)throw new Error(result.error||"Action failed.");router.refresh();
 }catch(e){setError(e instanceof Error?e.message:"Action failed.");}finally{setBusy(false)}}
 return <div><button className="agro-button agro-secondary" type="button" onClick={run} disabled={busy}>{busy?"Saving…":label}</button>{error&&<p className="agro-error" role="alert">{error}</p>}</div>;
}
