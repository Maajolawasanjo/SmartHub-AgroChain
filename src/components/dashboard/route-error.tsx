"use client";
import Link from "next/link";
import {useEffect} from "react";
export function WorkspaceRouteError({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
 useEffect(()=>{console.error("Workspace route failed",error.digest??error.name)},[error]);
 return <main className="workspace-content"><section className="workspace-empty" role="alert"><span className="workspace-empty-symbol" aria-hidden="true">!</span><h1 className="text-xl font-bold">This workspace could not load</h1><p>Your data has not been replaced with made-up figures. Retry the request, or return to sign in if your session expired.</p><div className="workspace-error-actions"><button type="button" onClick={()=>reset()}>Try again</button><Link href="/auth/redirect">Go to my dashboard</Link><Link href="/contact">Get help</Link></div></section></main>
}
