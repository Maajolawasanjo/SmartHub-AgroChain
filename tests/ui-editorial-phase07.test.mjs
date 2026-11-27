import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("account shell has its own editorial design and preserves existing access controls",()=>{
 for(const name of ["live-auth","auth-experience"])assert.match(read("src/features/auth/components/"+name+".tsx"),/className="auth-layout auth-editorial"/);
 assert.match(read("src/app/globals.css"),/auth-editorial\.css/);
 const css=read("src/styles/auth-editorial.css");
 assert.match(css,/\.auth-editorial \.auth-heading h1/);
 assert.match(css,/font-weight: var\(--font-weight-bold\)/);
 assert.match(css,/aria-invalid="true"/);
 assert.match(css,/focus-visible/);
 assert.match(read("src/features/auth/components/auth-experience.tsx"),/ACCOUNT SERVICES NOT ENABLED/);
 assert.match(read("src/features/auth/components/live-auth.tsx"),/validateSignup\(candidate\)/);
});
