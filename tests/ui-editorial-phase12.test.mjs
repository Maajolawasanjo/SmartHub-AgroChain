import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("final outcome styles and keyboard navigation preserve existing security behavior",()=>{
 for(const path of ["src/app/account/status/page.tsx","src/app/forgot-password/sent/page.tsx","src/app/reset-password/success/page.tsx","src/features/auth/components/deletion-status.tsx"])assert.match(read(path),/auth-outcome-panel/);
 assert.match(read("src/app/forgot-password/sent/page.tsx"),/If the address is eligible/);
 assert.match(read("src/app/reset-password/success/page.tsx"),/If your password update completed/);
 const chrome=read("src/components/dashboard/dashboard-chrome.tsx");
 assert.match(chrome,/aria-label="Account menu"/);
 assert.match(chrome,/profileTrigger.current\?\.focus\(\)/);
 assert.match(chrome,/menuButton.current\?\.focus\(\)/);
 assert.match(read("src/styles/workspace-editorial.css"),/\.workspace-layout \.auth-submit/);
});
