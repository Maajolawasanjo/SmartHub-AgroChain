import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assertV2Origin,assessV2Identity,V2_RELEASE_ORIGIN} from "../scripts/release/verify-v2-deployment.mjs";

const sha="0123456789abcdef0123456789abcdef01234567";
const good={
 application:"SmartHub AgroChain",
 repository:"Maajolawasanjo/SmartHub-AgroChain",
 commit:sha,branch:"main",environment:"production"
};
test("Phase 19 verifier binds only to intentionally created V2 Vercel project",()=>{
 assert.equal(assertV2Origin(V2_RELEASE_ORIGIN),V2_RELEASE_ORIGIN);
 assert.equal(assertV2Origin(V2_RELEASE_ORIGIN+"/"),V2_RELEASE_ORIGIN);
 for(const url of [
  "https://www.smarthubagrochain.online",
  "https://smarthubagrochain.online",
  "https://smarthub-agrochain-eight.vercel.app",
  "https://smarthub-agronexus.vercel.app",
  "https://smarthub-agrochain-v2.vercel.app.attacker.test",
  "https://smarthub-agrochain-v2.vercel.app.evil",
  "http://smarthub-agrochain-v2.vercel.app",
  "https://user:pass@smarthub-agrochain-v2.vercel.app",
  "https://smarthub-agrochain-v2.vercel.app/foo",
  "https://smarthub-agrochain-v2.vercel.app?token=abc",
  "not-a-url"
 ])assert.throws(()=>assertV2Origin(url));
});
test("Phase 19 accepts exact reviewed V2 repository, main production commit identity",()=>{
 const r=assessV2Identity(good,sha);
 assert.deepEqual(r,{ok:true,errors:[]});
 assert.equal(assessV2Identity({...good,repository:"maajolawasanjo/smarthub-agrochain"},sha).ok,true);
});
test("Phase 19 rejects stale SHA, wrong repo, unknown Git metadata and previews",()=>{
 for(const payload of [
  {...good,repository:"Maajolawasanjo/smarthub-agronexus"},
  {...good,repository:null},
  {...good,commit:"a".repeat(40)},
  {...good,commit:null},
  {...good,environment:"preview"},
  {...good,environment:null},
  {...good,branch:"feat/test"},
  {...good,branch:null},
  {...good,application:"A different product"},
  null,[],{},true
 ])assert.equal(assessV2Identity(payload,sha).ok,false);
 assert.equal(assessV2Identity(good,"").ok,false);
 assert.equal(assessV2Identity(good,"not-a-commit").ok,false);
});
test("Phase 19 release proof is read-only and exposes no credentials",()=>{
 const endpoint=readFileSync("src/app/api/release/identity/route.ts","utf8");
 const verifier=readFileSync("scripts/release/verify-v2-deployment.mjs","utf8");
 assert.match(endpoint,/VERCEL_GIT_COMMIT_SHA/);
 assert.match(endpoint,/VERCEL_GIT_REPO_OWNER/);
 assert.match(endpoint,/VERCEL_GIT_REPO_SLUG/);
 assert.match(endpoint,/Cache-Control":"no-store"/);
 assert.match(endpoint,/X-Robots-Tag":"noindex"/);
 assert.doesNotMatch(endpoint,/DATABASE_URL|DIRECT_URL|SUPABASE_SECRET|PAYSTACK|\$query|\.create\(/);
 assert.match(verifier,/method:"GET"/);
 assert.match(verifier,/redirect:"error"/);
 assert.doesNotMatch(verifier,/method:"POST"|migrate deploy|vercel deploy|vercel promote|vercel rollback/);
});
