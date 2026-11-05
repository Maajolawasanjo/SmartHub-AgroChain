import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const auth=readFileSync("src/app/api/auth/[action]/route.ts","utf8");
const cb=readFileSync("src/app/auth/callback/route.ts","utf8");
test("email resend and signup share the typed verification callback",()=>{
 const signup=auth.split('case "signup":')[1].split('case "login":')[0];
 const resend=auth.split('case "resend-email":')[1].split('case "logout":')[0];
 const target="/auth/callback?type=email";
 assert.ok(signup.includes(target));
 assert.ok(resend.includes(target));
 assert.ok(resend.includes('supabase.auth.resend({type:"signup"'));
});
test("provider-verification callback resolves identity itself",()=>{
 assert.ok(cb.includes("verifyOtp("));
 assert.ok(cb.includes("supabase.auth.getUser()"));
 assert.ok(cb.includes("reconcilePublicAccount(user)"));
});
