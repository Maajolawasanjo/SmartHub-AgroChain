import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
const read=p=>readFileSync(join(process.cwd(),p),"utf8");

test("Phase 06 adds same-origin protected crop edit and supply withdrawal endpoints",()=>{
 for(const p of ["src/app/api/farmer/crops/[id]/route.ts","src/app/api/farmer/supplies/[id]/withdraw/route.ts"]){
  assert.ok(existsSync(p),p);assert.match(read(p),/assertSameOrigin\(req\)/);assert.match(read(p),/errorReply\(e\)/);
 }
 assert.match(read("src/app/api/farmer/crops/[id]/route.ts"),/updateCrop/);
 assert.match(read("src/app/api/farmer/supplies/[id]/withdraw/route.ts"),/withdrawSupply/);
});
test("crop edits are owner scoped, version guarded, audited and do not mutate supply",()=>{
 const a=read("src/server/agriculture/actions.ts");
 const fn=a.slice(a.indexOf("export async function updateCrop("),a.indexOf("async function validateSupplyLinks("));
 assert.match(fn,/requireActor\("FARMER"\)/);assert.match(fn,/farmerId:account\.id/);
 assert.match(fn,/updatedAt:existing\.updatedAt/);assert.match(fn,/CROP_UPDATED/);
 assert.match(fn,/supplyDeclaration\.count/);assert.doesNotMatch(fn,/supplyDeclaration\.update/);
});
test("withdrawal is atomic, limited to draft/pending and recorded as an event",()=>{
 const a=read("src/server/agriculture/actions.ts");
 const fn=a.slice(a.indexOf("export async function withdrawSupply("),a.indexOf("export async function reviewFarmer("));
 assert.match(fn,/\["DRAFT","PENDING_REVIEW"\]/);assert.match(fn,/status:current\.status/);
 assert.match(fn,/status:"WITHDRAWN"/);assert.match(fn,/SUPPLY_WITHDRAWN/);
 assert.match(fn,/supplyReviewEvent\.create/);assert.match(fn,/reason/);
 assert.doesNotMatch(fn,/APPROVED.*updateMany/s);
});
test("crop update contract retains farm and commodity provenance",()=>{
 const v=read("src/server/agriculture/validators.ts");
 assert.match(v,/cropUpdateInput/);assert.match(v,/updatedAt:z\.iso\.datetime/);
 const update=v.slice(v.indexOf("export const cropUpdateInput"),v.indexOf("export const supplyInput"));
 assert.doesNotMatch(update,/farmId|commodityId/);
 assert.match(v,/Expected harvest cannot precede planting/);
});
test("farmer routes prefill owned crops without copying estimated quantity into physical supply",()=>{
 const page=read("src/app/farmer/my-supply/[...slug]/page.tsx");
 assert.match(page,/query\.cropId/);assert.match(page,/farmerId:account\.id/);
 assert.match(page,/quantity:""/);assert.match(page,/WithdrawSupplyForm/);
 assert.match(page,/crop\.updatedAt\.toISOString\(\)/);
});
test("dashboard reads real farmer events and next harvest, not fabricated opportunities",()=>{
 const page=read("src/app/farmer/page.tsx");
 assert.match(page,/farmerVerificationEvent\.findMany/);assert.match(page,/supplyReviewEvent\.findMany/);
 assert.match(page,/expectedHarvestAt:\{gte:today\}/);
 assert.match(page,/Not enabled yet/);assert.doesNotMatch(page,/mock|fake opportunity|sample farmer/i);
});
test("KYC and settings expose real account data without invented document or preference saves",()=>{
 const kyc=read("src/app/farmer/kyc/page.tsx");
 const settings=read("src/app/farmer/settings/page.tsx");
 assert.match(kyc,/account\.email/);assert.match(kyc,/verification\.events/);
 assert.match(settings,/not editable saved preferences/);
 assert.doesNotMatch(settings,/Save Preferences|Save Notification Preferences/);
});
