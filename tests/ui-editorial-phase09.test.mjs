import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("buyer and farmer overview design is role-scoped and retains real metrics",()=>{
 const buyer=read("src/app/dashboard/page.tsx"),farmer=read("src/app/farmer/page.tsx");
 assert.match(buyer,/buyer-overview-panels/);
 assert.match(farmer,/farmer-overview-metrics/);
 assert.match(buyer,/organizationId:member.organizationId/);
 assert.match(farmer,/farmerId:account.id/);
 assert.match(read("src/components/dashboard/dashboard-chrome.tsx"),/data-workspace-role=\{role\}/);
 assert.match(read("src/app/dashboard/buyer.css"),/data-workspace-role="BUYER"/);
 assert.match(read("src/styles/workspace-editorial.css"),/data-workspace-role="FARMER"/);
});
