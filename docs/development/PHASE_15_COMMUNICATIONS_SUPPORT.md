# Phase 15 — Transactional inbox, support and settings

Branch: feat/phase-15-notifications-support, stacked on Phase 14 PR #19. Status: implementation candidate; not merged or deployed. The project has no authorized Supabase staging database yet, so real database migrations, row-level permissions and browser E2E are not claimed as tested.

## Product boundary
SmartHub now records actual in-app notifications for authorized accounts and provides a shared case-based support inbox. This is not email, SMS, push, WhatsApp, a verified delivery receipt for external messaging, or a stored-value wallet. No fake operational records or synthetic success updates are produced. In-app inbox refresh uses a 20-second foreground browser poll, not a WebSocket or claimed instantaneous subscription.

## Data model
- OutboxEvent: one unique eventKey, event type, optional accountable actor, subject and minimal metadata. The event is written in the same Prisma transaction that commits the source business event.
- Notification: one account-scoped in-app message per event, with title/body, validated same-origin workspace actionPath, category, timestamp and nullable readAt; unique event+recipient prevents duplicates.
- NotificationDeliveryAttempt: unique event, recipient, IN_APP channel status DELIVERED or SKIPPED. An in-app delivered state denotes DB inbox insertion, not that a human viewed a message; no email/SMS attempts are invented.
- NotificationPreference: buyer/farmer/agent/staff account preferences for procurement, finance, logistics and support; mandatory SECURITY-category updates cannot be suppressed. No external delivery preferences are falsely advertised.
- SupportCase and SupportMessage: requester-owned conversation, role-checked Operations/Super Admin queue, claim ownership, internal staff-only notes, resolution and closure control, idempotency client keys and audit history.
- SupportCase status: OPEN -> IN_PROGRESS / AWAITING_CUSTOMER -> RESOLVED -> CLOSED; requester may reopen RESOLVED. Staff-only internal note does not notify or change customer-facing status.
- PostgreSQL migration creates all six models with indexes, uniqueness, checked paths, RLS enabled and all direct anon/authenticated Data API grants revoked.

## Real event integration
1. Buyer request milestones, including submission, clarification, review and close, generate a deduplicated buyer-organization update. New submitted sourcing requirements also notify active Operations/Super Admin. Private never-submitted drafts produce no notifications.
2. Independently Paystack-verified buyer payments notify the buyer organization OWNER with a link to their own payment record; no checkout initiation, callback or signed webhook body alone produces a paid notification.
3. Operations-reported arrival with recorded shipment evidence notifies buyer owners to confirm actual physical quantities. It is explicitly not proof of receipt.
4. Provider-verified farmer supplier settlement notifies the source farmer after settlement is committed; pending/OTP/unknown transfers never produce a paid notification.
5. Opening, replying to and transitioning a support case creates inbox events for intended staff or requester; internal notes remain private.

## API and authorization
- Authenticated server-only account identity from Supabase and active Account role controls every read/write. The inbox reads and read/unread updates are restricted to accountId; preference updates never mutate another user.
- Internal notification events refuse arbitrary external URLs or links outside a recipient role's valid workspace, so no sender-controlled redirect is introduced.
- Support requester sees only their own ticket and public messages. Operations and Super Admin see a support queue; Operations must claim a case before replying, and only assigned staff or Super Admin can transition its status. Customer cannot submit internal notes or close a case as solved.
- Messages/cases require client UUID idempotency keys, and committed notes/audit events are stored in the same serializable transaction. Duplicate retries do not create duplicate conversations.
- APIs require same-origin POST on all mutations. Case detail, account activity and notification pages use no-store server-driven queries. The account activity page shows only the authenticated actor's own recent audit actions, without raw sensitive metadata.

## Shared portal pages
Unified /inbox, /settings/notifications, /support, /support/cases/[id], and /activity; activated links in Buyer, Farmer, Field Agent, Operations and Super Admin navigation. Legacy /dashboard/notifications and /farmer/notifications redirect to the unified private inbox.

## Staging/release gates — not completed
1. Apply the entire migration chain through 20261104090000_notifications_support in an isolated Supabase PostgreSQL staging project. Verify RLS, revocation, FK types, indexes and only server-authorized service writes.
2. Browser-test Buyer A/B, Farmer A/B, Field Agent, assigned/unassigned Operations, Super Admin, suspended accounts and revoked membership across inbox, action links, support case owner access, staff-only notes and reply actions.
3. Simulate duplicate request transitions, parallel notification emission, duplicate support submit/message retries, conflicting claim requests, skip preferences, mandatory SECURITY events and correct no-data empty states.
4. Verify in-app notifications for genuine request submission, Paystack verify, delivery arrival and transfer verify with actual staging transactions. An in-app 'delivered' marker is DB storage, not an external push receipt.
5. Approve a staff-support ownership and service-level policy and a retention/redaction process. Current query is capped at 80 cases, 120 messages per case and latest 60-80 notifications/activity; add search/pagination and archival policy for larger tenants.
6. Any future email, SMS or push channel must have an approved provider, encrypted credentials, opt-in/consent, retry limits, dead-letter queue, provider receipts, unsubscribe/opt-out policy and security testing. Do not claim them from this phase.
7. No production-ready certification, real-time WebSocket capability, third-party messaging, financial settlement or external alert delivery is claimed solely because code or CI passes.

Documentation is scoped to actual committed code. If CI fails, treat the implementation as unverified until the latest head passes.