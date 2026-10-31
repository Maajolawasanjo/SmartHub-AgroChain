import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");

test("public signup uses server-issued intents, verified email and atomic one-time provisioning",()=>{
 const action=read("src/app/api/auth/[action]/route.ts");
 const provision=read("src/server/auth/provisioning.ts");
 const context=read("src/server/auth/context.ts");
 const sql=read("prisma/migrations/20261102000000_auth_lifecycle/migration.sql");
 assert.match(action,/createSignupIntent\(data\)/);
 assert.match(action,/SIGNUP_INTENT_METADATA_KEY/);
 assert.match(provision,/user\.email_confirmed_at/);
 assert.match(provision,/consumedAt:null/);
 assert.match(provision,/email, expiresAt/);
 assert.match(provision,/db\.\$transaction/);
 assert.match(provision,/tx\.account\.create/);
 assert.match(provision,/role:intent\.role/);
 assert.match(context,/reconcilePublicAccount/);
 assert.match(sql,/CHECK \("role" IN \('BUYER','FARMER'\)\)/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE "signup_intents" FROM anon, authenticated/);
 assert.doesNotMatch(provision,/role:user\.user_metadata/);
});

test("callback is type-bound, redirects only to configured site, handles recovery and public reconciliation",()=>{
 const callback=read("src/app/auth/callback/route.ts");
 assert.match(callback,/siteUrl\(\)/);
 assert.match(callback,/get\("type"\)/);
 assert.match(callback,/verifyOtp/);
 assert.match(callback,/reconcilePublicAccount\(user\)/);
 assert.match(callback,/setRecoveryTicket\(user\.id\)/);
 assert.doesNotMatch(callback,/\?\?"email"/);
});

test("isolated reauthentication never writes current browser Supabase session",()=>{
 const verifier=read("src/server/auth/reauth.ts");
 assert.match(verifier,/persistSession:false/);
 assert.match(verifier,/autoRefreshToken:false/);
 assert.match(verifier,/data\.user\?\.id !== expectedId/);
 const account=read("src/app/api/account/[action]/route.ts");
 for(const action of ['case "password"','case "email"','case "phone"','case "delete-request"','case "revoke-others"'])assert.ok(account.includes(action));
 assert.ok((account.match(/verifyCurrentPassword\(/g)||[]).length>=5);
 assert.doesNotMatch(account,/supabase\.auth\.signInWithPassword/);
 const ui=read("src/features/auth/components/live-auth.tsx");
 for(const id of ["email-current-password","phone-current-password","sessions-current-password"])
  assert.ok(ui.includes(id),id);
});

test("phone change checks provider pending number, account identity, retries and attempt lock",()=>{
 const route=read("src/app/api/auth/[action]/route.ts");
 const sql=read("prisma/migrations/20261102000000_auth_lifecycle/migration.sql");
 assert.match(route,/ctx\.user\.new_phone===targetPhone/);
 assert.match(route,/throttle\.targetPhone!==targetPhone/);
 assert.match(route,/verified\.user\?\.id!==ctx\.account\.id/);
 assert.match(route,/attempts:\{increment:1\}/);
 assert.match(route,/lockedUntil/);
 assert.match(route,/db\.\$transaction/);
 assert.match(sql,/"targetPhone" VARCHAR\(20\)/);
 assert.match(sql,/"attempts" INTEGER NOT NULL DEFAULT 0/);
});

test("invitation is saved before external email and acceptance never takes role from client",()=>{
 const sent=read("src/app/api/admin/staff/invite/route.ts");
 const accept=read("src/app/api/auth/accept-invite/route.ts");
 assert.ok(sent.indexOf("db.staffInvitation.create") < sent.indexOf("inviteUserByEmail"));
 assert.match(accept,/role:invitation\.role/);
 assert.match(accept,/invitedUserId:ctx\.user\.id/);
 assert.match(accept,/status:"PENDING"/);
 assert.match(accept,/tx\.staffInvitation\.updateMany/);
});

test("real session revoke and deletion cancellation present but delete still request-only",()=>{
 const account=read("src/app/api/account/[action]/route.ts");
 assert.match(account,/scope:"others"/);
 assert.match(account,/status:"CANCELLED"/);
 assert.match(account,/ACCOUNT_DELETION_REQUEST_CANCELLED/);
 assert.doesNotMatch(account,/auth\.admin\.deleteUser/);
 assert.ok(existsSync("src/app/account/delete/cancelled/page.tsx"));
 const experience=read("src/features/auth/components/auth-page.tsx");
 assert.match(experience,/"\/account\/sessions"/);
 assert.match(experience,/"\/account\/delete\/cancel"/);
});
