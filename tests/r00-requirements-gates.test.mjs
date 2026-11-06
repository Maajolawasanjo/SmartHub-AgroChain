import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const raw=readFileSync("docs/implementation/r00-gates.json","utf8");
const data=JSON.parse(raw);
const known=new Set(["PENDING_OWNER_DECISION","APPROVED","SUPERSEDED","DEFERRED"]);

test("R00 public decision gate metadata contains no confidential client source material",()=>{
 assert.equal(data.version,1);
 assert.equal(data.public_metadata_only,true);
 assert.equal(data.source_docs_private,true);
 assert.match(data.baseline_commit,/^[a-f0-9]{40}$/);
 assert.ok(Array.isArray(data.gates)&&data.gates.length>=5);
 for(const gate of data.gates){
  assert.deepEqual(Object.keys(gate).sort(),["approved_at","approved_by","category","decision_record_ref","id","status"].sort());
  assert.match(gate.id,/^R00-D\d{2}$/);
  assert.match(gate.category,/^[a-z]+(?:-[a-z]+)*$/);
 }
 assert.doesNotMatch(raw,/secret|password|postgresql:\/\/|sb_secret_|sk_live_/i);
});

test("each decision gate has unique ID and requires explicit reference and approver for any approval or deferral",()=>{
 const seen=new Set();
 for(const gate of data.gates){
  assert.ok(!seen.has(gate.id),"duplicate ID "+gate.id);
  seen.add(gate.id);
  assert.ok(known.has(gate.status),gate.id);
  if(gate.status==="APPROVED"||gate.status==="SUPERSEDED"||gate.status==="DEFERRED"){
   assert.ok(typeof gate.decision_record_ref==="string"&&gate.decision_record_ref.trim().length>=8,"missing evidence: "+gate.id);
   assert.ok(typeof gate.approved_by==="string"&&gate.approved_by.trim().length>=3,"missing approver: "+gate.id);
   assert.ok(!Number.isNaN(Date.parse(gate.approved_at)),"missing approval date: "+gate.id);
  }else{
   assert.equal(gate.decision_record_ref,null);
   assert.equal(gate.approved_by,null);
   assert.equal(gate.approved_at,null);
  }
 }
});

test("published governance protocol does not mistake source CI or a summary for business approval",()=>{
 const doc=readFileSync("docs/implementation/R00_REQUIREMENTS_GOVERNANCE.md","utf8");
 assert.match(doc,/passing CI workflow is not product-owner signoff/i);
 assert.match(doc,/a summary is \*\*not automatically\*\* a replacement/i);
 assert.match(doc,/source PDFs.*\*\*not\*\* stored in this public repository/i);
 assert.match(doc,/block the affected decision/i);
});
