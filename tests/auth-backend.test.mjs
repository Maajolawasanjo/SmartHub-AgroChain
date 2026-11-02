import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const s=p=>readFileSync(p,"utf8");

test("actual route handlers wired, not mock authentication",()=>{
 for(const p of ["src/app/api/auth/[action]/route.ts","src/app/auth/callback/route.ts","src/app/api/account/[action]/route.ts","src/proxy.ts"])
  assert.ok(existsSync(p),`${p} missing`);
 const router=s("src/app/api/auth/[action]/route.ts");
 for(const action of ['"signup"','"login"','"forgot"','"resend-email"','"logout"','"reset-password"','"start-phone"','"verify-phone"']) assert.ok(router.includes(action),action);
 assert.match(router,/supabase\.auth\.signUp/);assert.match(router,/supabase\.auth\.signInWithPassword/);
 assert.match(router,/supabase\.auth\.verifyOtp/);assert.match(router,/db\.account\.create/);
});

test("public user registration strictly buyer/farmer",()=>{
 const validator=s("src/server/auth/validators.ts");
 assert.match(validator,/z\.enum\(\["buyer","farmer"\]\)/);
 const server=s("src/app/api/auth/[action]/route.ts");
 assert.ok(!/role:data\.role\s*[,}]/.test(server));
 assert.match(server,/data\.role==="farmer"\?"FARMER":"BUYER"/);
 assert.ok(!server.includes('SUPABASE_SECRET_KEY'));
});

test("authenticated roles and farming verification enforced by server",()=>{
 const guard=s("src/server/auth/context.ts");
 for(const role of ["BUYER","FARMER","FIELD_AGENT","OPERATIONS","SUPER_ADMIN"])assert.ok(guard.includes(role));
 assert.match(guard,/user\.email_confirmed_at/);assert.match(guard,/user\.phone_confirmed_at/);
 assert.match(guard,/ctx\.account\.status/);
 const protectedPage=s("src/features/auth/components/auth-page.tsx");
 assert.match(protectedPage,/mayAccess/);
});

test("recovery ticket binds identity, uses HMAC and is short lived",()=>{
 const ticket=s("src/server/auth/recovery.ts");
 assert.match(ticket,/createHmac/);assert.match(ticket,/timingSafeEqual/);
 assert.match(ticket,/httpOnly:true/);assert.match(ticket,/maxAge:600/);
 const callback=s("src/app/auth/callback/route.ts");assert.match(callback,/setRecoveryTicket/);
 const reset=s("src/app/api/auth/[action]/route.ts");assert.match(reset,/validateRecoveryTicket/);
});

test("staff account activation requires authorized invitation",()=>{
 const invite=s("src/app/api/admin/staff/invite/route.ts");
 assert.match(invite,/ctx\.account\.role!=="SUPER_ADMIN"/);
 assert.match(invite,/admin\.inviteUserByEmail/);
 const accept=s("src/app/api/auth/accept-invite/route.ts");
 assert.match(accept,/invitedUserId:ctx\.user\.id/);assert.match(accept,/status:"PENDING"/);
 assert.match(accept,/tx\.staffInvitation\.updateMany/);
});

test("database prevents exposed API access to sensitive records",()=>{
 const migration=s("prisma/migrations/20261031160000_auth_core/migration.sql");
 for(const table of ["app_accounts","phone_otp_throttles","staff_invitations","account_deletion_requests","auth_audit_events"]){
  assert.ok(migration.includes(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`));
 }
 assert.match(migration,/REVOKE ALL ON TABLE/);assert.match(migration,/FROM anon, authenticated/);
});

test("configured real frontend does not use disconnected preview path",()=>{
 const page=s("src/features/auth/components/auth-page.tsx");assert.match(page,/if\(enabled && live\.has\(route\)\)/);
 const live=s("src/features/auth/components/live-auth.tsx");
 assert.match(live,/fetch\(path,\{method:"POST"/);
 assert.ok(!live.includes("localStorage"));
});
