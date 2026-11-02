"use client";
import { WorkspaceRouteError } from "@/components/dashboard/route-error";
export default function Error({error,reset}:{error:Error & {digest?:string};reset:()=>void}){return <WorkspaceRouteError error={error} reset={reset}/>}
