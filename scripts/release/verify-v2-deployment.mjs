import {pathToFileURL} from "node:url";

export const V2_RELEASE_ORIGIN="https://smarthub-agrochain-v2.vercel.app";
export const EXPECTED_SOURCE="maajolawasanjo/smarthub-agrochain";
const hexSha=/^[a-f0-9]{40}$/i;

// Phase 19 targets V2 only. The older Agronexus live domain and the duplicate
// smarthub-agrochain-eight project must not be probed/promoted by this tool.
export function assertV2Origin(value){
 let url;
 try{url=new URL(value??"");}catch{throw Error("Invalid V2 deployment origin.");}
 if(url.protocol!=="https:"||url.origin!==V2_RELEASE_ORIGIN||
    url.username||url.password||url.pathname!=="/"||url.search||url.hash)
  throw Error("Phase 19 accepts only the reviewed V2 Vercel hostname.");
 return url.origin;
}
export function assessV2Identity(payload,expectedSha){
 const errors=[];
 if(!hexSha.test(expectedSha??""))errors.push("Expected GitHub commit SHA must be 40 hexadecimal characters.");
 if(!payload||typeof payload!=="object"||Array.isArray(payload))
  return {ok:false,errors:["Deployment identity response is missing or invalid."]};
 if(payload.application!=="SmartHub AgroChain")errors.push("Unexpected application.");
 if(typeof payload.repository!=="string"||
    payload.repository.toLowerCase()!==EXPECTED_SOURCE)
  errors.push("Deployed Git repository identity is missing or does not match redesigned SmartHub.");
 if(typeof payload.commit!=="string"||!hexSha.test(payload.commit)||
    payload.commit.toLowerCase()!==(expectedSha??"").toLowerCase())
  errors.push("Deployed commit is absent or differs from reviewed main.");
 if(payload.branch!=="main")errors.push("Deployment does not report the reviewed main branch.");
 if(payload.environment!=="production")errors.push("Deployment is not marked production.");
 return {ok:errors.length===0,errors};
}
async function main(){
 const shaArg=process.argv.find(x=>x.startsWith("--sha="));
 const urlArg=process.argv.find(x=>x.startsWith("--url="));
 const sha=shaArg?.slice(6)??process.env.SMART_HUB_EXPECTED_COMMIT_SHA??"";
 let origin;
 try{origin=assertV2Origin(urlArg?.slice(6)??V2_RELEASE_ORIGIN);}
 catch{console.error("PHASE19 REJECTED: only the intended V2 project hostname is allowed.");process.exitCode=2;return;}
 if(!hexSha.test(sha)){
  console.error("PHASE19 REJECTED: provide --sha=<40-hex-commit-from-reviewed-main>.");
  process.exitCode=2;return;
 }
 let response;
 try{
  response=await fetch(origin+"/api/release/identity",{
   method:"GET",redirect:"error",cache:"no-store",signal:AbortSignal.timeout(12000),
   headers:{Accept:"application/json"}
  });
  if(!response.ok||!(response.headers.get("content-type")??"").includes("application/json"))
   throw Error("No valid identity endpoint.");
  const payload=await response.json();
  const result=assessV2Identity(payload,sha);
  console.log(JSON.stringify({target:"SmartHub V2",expectedCommit:sha,verified:result.ok,
   errors:result.errors},null,2));
  if(!result.ok)process.exitCode=1;
 }catch{
  console.error("PHASE19 NOT VERIFIED: V2 identity endpoint is unavailable or protected. No release action was taken.");
  process.exitCode=1;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 main().catch(()=>{console.error("PHASE19 NOT VERIFIED: release inspection failed.");process.exitCode=1;});
