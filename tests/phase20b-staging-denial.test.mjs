import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessAccessDenial} from "../scripts/release/staging-access-denial.mjs";

const origin="https://preview-smarthub-agrochain-v2.example.test";
const response=(status,location)=>({
 status,headers:{get:(name)=>name.toLowerCase()==="location"?location??null:null}
});

test("Phase 20B: explicit unauthorized, forbidden and not-found count as denied access",()=>{
 for(const status of [401,403,404]){
  assert.equal(assessAccessDenial(response(status),origin).ok,true,status+" must be accepted");
 }
});
test("Phase 20B: genuine expected authentication redirects are valid denials",()=>{
 for(const status of [301,302,303,307,308]){
  for(const destination of ["/login","/forbidden","/unauthorized","/verify-email","/verify-phone",
    "/account/status","/account/security/mfa","/account/security/operations-mfa"]){
   assert.equal(assessAccessDenial(response(status,destination),origin).ok,true,
      status+" "+destination+" should be expected");
  }
 }
 assert.equal(assessAccessDenial(response(307,origin+"/login?next=%2Fadmin"),origin).ok,true);
});
test("Phase 20B: HTTP 500/503, rate limits, success and unknown redirects NEVER prove RBAC",()=>{
 for(const status of [200,201,202,204,206,304,400,405,408,409,418,422,429,500,502,503,504]){
  assert.equal(assessAccessDenial(response(status),origin).ok,false,
     status+" must not be classified as an authorization denial");
 }
 for(const destination of [null,"","/dashboard","/admin","/api/admin/reports/export",
  "/","/support","/api/auth/login","/not-found",
  "https://unrelated.example/login","https://preview-smarthub-agrochain-v2.example.test.attacker.invalid/login",
  "//unrelated.example/login","mailto:security@example.test","%%%%"]) {
  assert.equal(assessAccessDenial(response(307,destination),origin).ok,false,
   String(destination)+" must be rejected");
 }
});
test("Phase 20B: staging role and tenant checks ALL use strict denial validation",()=>{
 const src=readFileSync("scripts/release/check-stage-http.mjs","utf8");
 assert.match(src,/import \{assessAccessDenial\}/);
 assert.equal((src.match(/assessAccessDenial\(/g)||[]).length,5);
 assert.doesNotMatch(src,/s=>s!==200/);
 assert.match(src,/BUYER_B/);
 assert.match(src,/BUYER_A/);
 assert.match(src,/STAGING_BUYER_A_SHIPMENT_ID/);
 assert.match(src,/STAGING_BUYER_A_SUPPORT_CASE_ID/);
 assert.match(src,/method:"GET",redirect:"manual"/);
 assert.doesNotMatch(src,/method:"POST"|method:"PATCH"|method:"DELETE"|method:"PUT"/);
});
