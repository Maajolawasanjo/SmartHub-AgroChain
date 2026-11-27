import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("premium catalogue preserves published-only data and sourcing paths",()=>{
 const list=read("src/app/products/page.tsx"),detail=read("src/app/products/[slug]/page.tsx");
 assert.match(list,/publicProducts\(q,category\)/);
 assert.match(list,/catalog-guide-grid/);
 assert.match(list,/Published catalogue is not connected yet/);
 assert.match(detail,/publicProduct\(slug\)/);
 assert.match(detail,/encodeURIComponent\(slug\)/);
 assert.match(detail,/Product details are unavailable/);
 assert.doesNotMatch(detail,/add.to.cart|checkout|buy.now/i);
 assert.match(read("src/lib/public/catalog.ts"),/publicPublished:true/);
 assert.match(read("src/styles/public-editorial.css"),/\.public-editorial \.editorial-catalog-detail \.public-detail-grid/);
});
