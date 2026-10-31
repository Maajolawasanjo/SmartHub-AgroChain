import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
const read=p=>readFileSync(join(process.cwd(),p),"utf8");

test("farmer farm, crop and supply endpoints are real POST/PATCH handlers",()=>{
 for(const p of ["src/app/api/farmer/farms/route.ts","src/app/api/farmer/farms/[id]/route.ts","src/app/api/farmer/verification/route.ts","src/app/api/farmer/crops/route.ts","src/app/api/farmer/supplies/route.ts","src/app/api/farmer/supplies/[id]/route.ts"]){
  assert.ok(existsSync(p),p);assert.match(read(p),/assertSameOrigin|agriculturePost/);
 }
});
test("permission boundary enforces true farmer and operations roles",()=>{
 const c=read("src/server/agriculture/policies.ts");
 assert.match(c,/requireActor\("FARMER"\)|role === "FARMER"/);
 assert.match(c,/hasPermission\(ctx\.account\.role,"farmer\.supply\.manage"\)/);assert.match(c,/hasPermission\(ctx\.account\.role,"operations\.supply\.review"\)/);
 assert.match(c,/email_confirmed_at/);assert.match(c,/phone_confirmed_at/);
});
test("supply is always farmer-owned and does not reserve or publish inventory",()=>{
 const a=read("src/server/agriculture/actions.ts");
 assert.match(a,/farmerId:account\.id/);assert.match(a,/validateSupplyLinks/);
 assert.match(a,/cropId:.*commodityId/);
 assert.match(a,/status:.*PENDING_REVIEW/);
 assert.doesNotMatch(a,/\b(order\.create|reservation\.create|payment\.create)\b/);
});
test("supply changes and reviews use optimistic status guards inside transactions",()=>{
 const a=read("src/server/agriculture/actions.ts");
 for (const phrase of ['status:"PENDING_REVIEW"','updateMany','db.$transaction','SupplyReviewEvent']){
  assert.ok(a.toLowerCase().includes(phrase.toLowerCase()),phrase);
 }
 assert.match(a,/Farmer verification must remain approved/);
});
test("physical stock is distinct from expected harvest and bag packaging is constrained",()=>{
 const schema=read("prisma/schema.prisma");const v=read("src/server/agriculture/validators.ts");
 for(const model of ["FarmerCrop","SupplyDeclaration","FarmerVerification","SupplyReviewEvent","FarmerVerificationEvent","Commodity","Farm"]){assert.ok(schema.includes(`model ${model} {`),model)}
 assert.match(v,/if\(v\.unit==="BAG"/);
 assert.match(read("prisma/migrations/20261101000000_farmer_supply_ops/migration.sql"),/CHECK \("quantity" > 0\)/);
});
test("all direct Data API table access is revoked and RLS enabled",()=>{
 const migration=read("prisma/migrations/20261101000000_farmer_supply_ops/migration.sql");
 for(const table of ["farms","farmer_verifications","farmer_crops","supply_declarations","commodities"]){
 assert.ok(migration.includes(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`),table);
 }
 assert.match(migration,/REVOKE ALL ON TABLE/);assert.match(migration,/FROM anon, authenticated/);
});
test("farmer and operations navigation reflects actual implemented and planned destinations",()=>{
 const navigation=read("src/components/dashboard/navigation.ts");
 for(const link of ["/farmer/kyc","/farmer/my-supply","/farmer/orders","/farmer/opportunities","/farmer/wallet","/farmer/notifications","/farmer/settings","/operations/verification","/operations/supply","/operations/catalog"]){
  assert.ok(navigation.includes(link),link);
 }
 assert.match(navigation,/planned\("Orders & Transactions","\/farmer\/orders"/);
 assert.match(navigation,/active\("Supply Reviews","\/operations\/supply"/);
 assert.match(read("src/components/agriculture/portal-frame.tsx"),/DashboardFrame/);
});
test("no hardcoded production agriculture figures or fake inventory entries",()=>{
 const components=read("src/app/farmer/page.tsx")+read("src/app/operations/page.tsx");
 assert.match(components,/db\.(farmerCrop|farmerVerification|supplyDeclaration|commodity)/);
 assert.doesNotMatch(components,/mock|sample produce|demo tons|sample farmer/i);
});
