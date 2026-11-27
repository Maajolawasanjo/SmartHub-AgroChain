import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("six informational pages use isolated public editorial composition",()=>{
 for(const route of ["product","about","how-it-works","for-buyers","for-farmers","partnerships"]){
  const page=readFileSync("src/app/"+route+"/page.tsx","utf8");
  assert.ok(page.includes("editorial-information editorial-info-"+route),route);
  assert.match(page,/EditorialHero/);
  assert.match(page,/EditorialCTA/);
 }
 const css=readFileSync("src/styles/public-editorial.css","utf8");
 assert.match(css,/\.public-editorial \.editorial-information \.editorial-detail-list/);
 assert.match(css,/\.public-editorial \.editorial-information \.editorial-dark-section/);
});
