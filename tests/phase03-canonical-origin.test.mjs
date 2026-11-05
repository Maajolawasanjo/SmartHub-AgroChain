import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const source=readFileSync("src/server/auth/http.ts","utf8");
const block=source.slice(source.indexOf("export function assertSameOrigin("));
assert.ok(block.startsWith("export function assertSameOrigin("));
const runnable=block.replace("export function assertSameOrigin(request:NextRequest)", "function assertSameOrigin(request)");
function run(input,{base="https://smarthub.example.org",mode="production"}={}){
 class PublicError extends Error {constructor(status,message){super(message);this.status=status;}}
 const context={URL,PublicError,process:{env:{APP_BASE_URL:base,NODE_ENV:mode}}};
 const check=vm.runInNewContext("("+runnable+")",context,{timeout:1000});
 const request={headers:{get:key=>input[key]??null}};
 try{check(request);return {ok:true};}catch(error){return {ok:false,status:error.status};}
}
test("canonical origin and matching host are accepted",()=>{
 assert.equal(run({origin:"https://smarthub.example.org",host:"smarthub.example.org"}).ok,true);
 assert.equal(run({origin:"http://localhost:3000",host:"localhost:3000"},{base:"http://localhost:3000",mode:"development"}).ok,true);
});
test("forged matching Host and Origin cannot override deployed canonical origin",()=>{
 for(const input of [
  {origin:"https://attacker.example",host:"attacker.example"},
  {origin:"https://smarthub.example.org",host:"attacker.example"},
  {origin:"http://smarthub.example.org",host:"smarthub.example.org"},
  {origin:"null",host:"smarthub.example.org"},
  {origin:"https://smarthub.example.org.evil.example",host:"smarthub.example.org.evil.example"},
  {origin:"https://smarthub.example.org/path",host:"smarthub.example.org"},
  {origin:"https://smarthub.example.org",host:null},
  {origin:null,host:"smarthub.example.org"}
 ]){const result=run(input);assert.equal(result.ok,false,JSON.stringify(input));assert.equal(result.status,403);}
});
test("production does not authorize HTTP even when misconfigured",()=>{
 const value=run({origin:"http://smarthub.example.org",host:"smarthub.example.org"},{base:"http://smarthub.example.org"});
 assert.equal(value.ok,false);assert.equal(value.status,403);
});
