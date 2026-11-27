import {test} from "node:test";
import assert from "node:assert/strict";
import {readdirSync,readFileSync} from "node:fs";
import {join} from "node:path";
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}
test("application source contains no gradient declarations or gradient utility classes",()=>{
 for(const path of [...walk("src"),...walk("public")].filter(p=>/\.(css|tsx|jsx|svg)$/.test(p))){
  const s=readFileSync(path,"utf8");
  assert.doesNotMatch(s,/(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(|\bbg-(?:gradient|linear|radial|conic)(?:-|\[)|<(?:linearGradient|radialGradient)\b/i,path);
 }
});
