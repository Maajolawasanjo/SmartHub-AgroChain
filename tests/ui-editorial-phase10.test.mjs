import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("field agent editorial styling preserves assignment and evidence workflow boundaries",()=>{
 const css=read("src/styles/workspace-editorial.css");
 assert.match(css,/data-workspace-role="FIELD_AGENT"/);
 assert.match(css,/\.field-agent-overview-metrics/);
 assert.match(css,/\.field-agent-upload-form/);
 assert.match(css,/@media\(max-width:760px\)/);
 for(const route of ["page.tsx","farmers/page.tsx","visits/page.tsx","visits/new/page.tsx","visits/[id]/page.tsx","reports/page.tsx"]){
  const src=read("src/app/field-agent/"+route);
  assert.match(src,/requireFieldAgentPage\(\)/);
  assert.match(src,/fieldAgentAssignment\.findMany/);
  assert.match(src,/active:true/);
 }
 const forms=read("src/features/field-agent/forms.tsx");
 assert.match(forms,/field-agent-report-panel/);
 assert.match(forms,/field-agent-evidence-panel/);
 assert.match(forms,/accept="image\/jpeg,image\/png,image\/webp,application\/pdf"/);
 assert.match(forms,/disabled=\{busy\|\|!file\}/);
 assert.match(forms,/window\.confirm/);
});
