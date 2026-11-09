import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const schema=read("prisma/schema.prisma");
const migration=read("prisma/migrations/20261104090000_notifications_support/migration.sql");
const inbox=read("src/server/communications/inbox.ts");
const support=read("src/server/communications/support.ts");
test("Phase 15 creates an inbox, delivery ledger, preferences and support conversation models",()=>{
 for(const model of ["OutboxEvent","Notification","NotificationDeliveryAttempt","NotificationPreference","SupportCase","SupportMessage"])
  assert.ok(schema.includes("model "+model+" {"),model);
 for(const route of [
  "src/app/inbox/page.tsx","src/app/settings/notifications/page.tsx",
  "src/app/support/page.tsx","src/app/support/cases/[id]/page.tsx","src/app/activity/page.tsx",
  "src/app/api/inbox/[id]/read/route.ts","src/app/api/inbox/read-all/route.ts",
  "src/app/api/preferences/notifications/route.ts","src/app/api/support/cases/route.ts",
  "src/app/api/support/cases/[id]/messages/route.ts","src/app/api/support/cases/[id]/transition/route.ts"
 ])assert.ok(existsSync(route),route);
});
test("all Phase 15 tables are private to server-owned APIs, RLS enabled, Data API grants revoked",()=>{
 for(const name of ["outbox_events","notifications","notification_delivery_attempts","notification_preferences","support_cases","support_messages"])
  assert.ok(migration.includes('ALTER TABLE "'+name+'" ENABLE ROW LEVEL SECURITY'),name);
 assert.match(migration,/REVOKE ALL ON TABLE/);
 assert.match(migration,/FROM anon, authenticated/);
});
test("inbox events are durable and idempotent within the source transaction",()=>{
 assert.match(inbox,/tx\.outboxEvent\.upsert/);
 assert.match(inbox,/eventKey:info\.eventKey/);
 assert.match(inbox,/tx\.notification\.upsert/);
 assert.match(inbox,/tx\.notificationDeliveryAttempt\.upsert/);
 assert.match(schema,/@@unique\(\[eventId,accountId\]\)/);
 assert.match(schema,/@@unique\(\[eventId,accountId,channel\]\)/);
 assert.match(migration,/outbox_events_eventKey_key/);
});
test("notification links are restricted to the recipient's actual workspace, never arbitrary external URLs",()=>{
 assert.match(inbox,/safePath\(user\.role,recipient\.actionPath\)/);
 assert.match(inbox,/!path\.startsWith\("\/"\)/);
 assert.match(inbox,/path\.startsWith\("\/\/"\)/);
 assert.match(inbox,/path\.split\("\/"\)\.includes\("\.\."\)/);
 assert.match(inbox,/SUPER_ADMIN:\["\/operations\/","\/admin\/"/);
});
test("preferences skip noncritical in-app notifications but cannot suppress SECURITY",()=>{
 assert.match(inbox,/recipient\.category==="SECURITY"/);
 assert.match(inbox,/status:accepted\?"DELIVERED":"SKIPPED"/);
 assert.match(inbox,/notificationPreference\.upsert/);
 assert.match(inbox,/accountId:account\.id/);
 assert.doesNotMatch(migration,/CREATE TYPE "OutboxDeliveryChannel" AS ENUM \('IN_APP','EMAIL'/);
});
test("request, payment, delivery and supplier provider outcomes are transactional event producers",()=>{
 for(const p of ["src/server/requests/service.ts","src/server/payments/reconciliation.ts",
  "src/server/fulfilment/operations.ts","src/server/settlements/reconciliation.ts"])
  assert.match(read(p),/publishInboxEvent\(tx/);
 assert.match(read("src/server/requests/service.ts"),/if\(kind==="CREATED"\|\|kind==="DRAFT_UPDATED"\)return/);
 assert.match(read("src/server/payments/reconciliation.ts"),/BUYER_PAYMENT_VERIFIED/);
 assert.match(read("src/server/settlements/reconciliation.ts"),/SUPPLIER_TRANSFER_VERIFIED/);
 assert.match(read("src/server/fulfilment/operations.ts"),/SHIPMENT_DELIVERY_REPORTED/);
 assert.match(read("src/server/settlements/agreements.ts"),/farmer-offer:/);
 assert.match(read("src/server/settlements/approval.ts"),/SUPPLIER_PAYABLE_APPROVED/);
});
test("read and read-all APIs enforce actor ownership and same-origin POST",()=>{
 assert.match(inbox,/where:\{id,accountId:account\.id\}/);
 assert.match(inbox,/where:\{accountId:account\.id,readAt:null\}/);
 for(const p of ["src/app/api/inbox/[id]/read/route.ts","src/app/api/inbox/read-all/route.ts",
   "src/app/api/preferences/notifications/route.ts"])
  assert.match(read(p),/assertSameOrigin\(request\)/);
});
test("support cases and messages have idempotency keys and client cannot access other users' tickets",()=>{
 assert.match(schema,/clientKey\s+String @unique @db\.Uuid/);
 assert.match(migration,/support_cases_clientKey_key/);
 assert.match(migration,/support_messages_clientKey_key/);
 assert.match(support,/old\.openedById!==account\.id/);
 assert.match(support,/previous\.caseId!==caseId\|\|previous\.authorId!==account\.id/);
 assert.match(support,/openedById:account\.id/);
 assert.match(support,/where:\{id,\.\.\.\(staffView\?\{\}:\{openedById:ctx\.account\.id\}\)\}/);
});
test("staff internal notes are never included in buyer/customer conversation queries or notifications",()=>{
 assert.match(support,/if\(value\.internal&&!staff\)/);
 assert.match(support,/where:staffView\?\{\}:\{internal:false\}/);
 assert.match(support,/if\(!value\.internal\)/);
 assert.match(support,/row\.assignedToId!==account\.id/);
 assert.match(support,/SUPPORT_INTERNAL_NOTE/);
});
test("support workflow retains explicit staff assignment and cannot silently close unresolved cases",()=>{
 assert.match(support,/FOR UPDATE/);
 assert.match(support,/TransactionIsolationLevel\.Serializable/);
 assert.match(support,/state==="CLOSED"&&row\.status!=="RESOLVED"/);
 assert.match(support,/if\(!owner\|\|row\.status!=="RESOLVED"\)/);
 assert.match(support,/SUPPORT_CASE_CREATED/);
 assert.match(support,/SUPPORT_MESSAGE_POSTED/);
});
test("all roles have real inbox, support and preferences navigation and no messaging provider is claimed",()=>{
 const nav=read("src/components/dashboard/navigation.ts");
 for(const path of ["/inbox","/support","/settings/notifications","/activity"])
  assert.ok(nav.includes(path),path);
 assert.match(read("src/app/inbox/page.tsx"),/about every 20 seconds/);
 assert.match(read("src/app/settings/notifications/page.tsx"),/NotificationPreferences/);
 assert.match(read("src/app/dashboard/notifications/page.tsx"),/redirect\("\/inbox"\)/);
 assert.match(read("src/app/farmer/notifications/page.tsx"),/redirect\("\/inbox"\)/);
});
