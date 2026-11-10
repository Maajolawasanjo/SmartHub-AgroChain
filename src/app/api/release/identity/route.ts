import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

// Public, non-sensitive release provenance only. Never expose project credentials,
// environment variable values, database endpoints, account data, or payment state.
export function GET(){
 const commitValue=process.env.VERCEL_GIT_COMMIT_SHA??"";
 const commit=/^[a-f0-9]{40}$/i.test(commitValue)?commitValue.toLowerCase():null;
 const provider=(process.env.VERCEL_GIT_PROVIDER??"").toLowerCase();
 const owner=process.env.VERCEL_GIT_REPO_OWNER??"";
 const name=process.env.VERCEL_GIT_REPO_SLUG??"";
 const safeSegment=/^[a-z0-9_.-]{1,100}$/i;
 const repository=provider==="github"&&safeSegment.test(owner)&&safeSegment.test(name)
  ?owner+"/"+name:null;
 const branchValue=process.env.VERCEL_GIT_COMMIT_REF??"";
 const branch=safeSegment.test(branchValue)?branchValue:null;
 const environment=process.env.VERCEL_ENV??"";
 return NextResponse.json({
  application:"SmartHub AgroChain",
  repository,commit,branch,
  environment:["production","preview","development"].includes(environment)?environment:null
 },{
  status:200,
  headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}
 });
}
