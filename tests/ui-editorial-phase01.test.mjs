import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read = path => readFileSync(path,"utf8");
const css = read("src/styles/public-editorial.css");
test("public editorial styles are loaded and scoped to PublicShell",()=>{
  assert.match(read("src/app/globals.css"), /@import "\.\.\/styles\/public-editorial\.css";/);
  assert.match(read("src/components/public-shell.tsx"), /className="public-editorial"/);
  assert.doesNotMatch(css, /:root\s*\{/);
  assert.doesNotMatch(css, /!important|#[0-9a-f]{3,8}\b/i);
  for(const line of css.split("\n").filter(line=>/^\s*\./.test(line))) {
    assert.match(line.trim(), /^\.public-editorial\b/);
  }
});
test("editorial tokens are restrained, responsive and use existing brand values",()=>{
  assert.match(css,/--public-content-max: 77\.5rem;/);
  assert.match(css,/--public-display-weight: var\(--font-weight-bold\);/);
  assert.match(css,/--public-emphasis-weight: var\(--font-weight-bold\);/);
  assert.match(css,/font-style: normal;/);
  assert.match(css,/--public-radius-image: 0px;/);
  assert.match(css,/@media \(max-width: 640px\)/);
  assert.match(css,/min-height: 44px;/);
  assert.match(css,/background: var\(--brand-forest-deep\);/);
});
