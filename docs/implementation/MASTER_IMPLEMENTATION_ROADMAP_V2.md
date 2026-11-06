# SmartHub AgroChain V2 — Master Implementation Roadmap

**Status:** Engineering implementation plan; not a production-readiness certificate.
**Current requirements gate (6 November 2026):** This roadmap does not resolve contradictions among client-approved specifications. Consult [R00 Requirements Governance](R00_REQUIREMENTS_GOVERNANCE.md) and [non-confidential decision gate metadata](r00-gates.json). Detailed source quotations, options and approvals remain outside the public repository. Do not implement a disputed commercial, privileged-access or architectural policy without explicit product-owner signoff. The 2026-10-31 baseline below is historical.
**Core stack:** Next.js App Router, TypeScript, React, Tailwind CSS, shadcn/ui, Prisma, Supabase PostgreSQL/Auth/Storage.
**Source hierarchy:** Client-approved PRD, Authentication Specification, Farmer Portal Specification, Buyer Portal Specification, Business Logic, User Flow, Public Website V3.0. Client decisions take precedence over suggestions in this roadmap.

## 1. Final-product definition

Deliver five integrated authenticated experiences (Farmer, Buyer, Field Agent, Operations, Super Admin) and the complete public website. The central business loop is:
**Farmer onboarding → farm/field evidence and verification → crop and physical supply declaration → supply review → buyer requirement → Operations assessment/matching → official quotation → buyer acceptance → verified payment/confirmed order → fulfillment and receipt/dispute → supplier settlement → transaction and audit history.**

The product is a **managed agricultural procurement and coordination platform**, not an unrestricted buyer–farmer marketplace. Identity/contact verification, operational verification, stock approval, reservation, payment confirmation, fulfillment and settlement are separate states and must remain separate in the database and UI.

## 2. Engineering rules for every implementation phase

- **One source of truth:** authorized PostgreSQL/Prisma records; never invented production metrics, customers, stock, financial records, notifications or testimonials.
- **Secure by default:** Supabase Auth identity, backend-derived roles, server policies scoped by ownership/assignment/organization, PostgreSQL controls, and auditable transitions. No authorization from user-editable JWT metadata, URL parameters or browser-supplied roles.
- **Active action contract:** every button/form has a destination, validated backend operation, authorized state transition, success/error behavior, and recovery path. Disabled/pending-service actions must be clearly explained.
- **Whole-flow QA:** verify actor A performs the change, actor B sees the correct authorized result, status history is preserved, and forbidden actor C cannot read/change the record.
- **No launch by URL alone:** Supabase project URL is not sufficient. Activation also needs publishable key, server-only credentials and same-project PostgreSQL connections, applied migrations, configured Auth redirects/email templates, Nigerian SMS provider, secrets, legal policy, CI build, browser E2E and real staging tests.
- **Non-production readiness:** code can be fully authored and unit/integration tested locally against disposable infrastructure without connecting a live Supabase project; hosted Auth, email, SMS, Postgres/RLS and payment-provider paths still require staged real-world verification.
- **Release-safe Git:** do not deploy the legacy domain or merge stacked draft branches before CI and acceptance gates. No confidential client documents or environment secrets in this public repository.

## 3. Current repository baseline (audit 2026-10-31)

- PR #1 foundation; PR #2 144-state auth frontend; PR #3 auth backend candidate; PR #4 Farmer/Operations supply candidate. All four are draft and not merged into `main`.
- Existing implemented candidates: auth routes/models, farm registration/editing, crop creation, physical supply drafts/submission, farmer verification/Operations review, commodity name management, basic Farmer and Operations dashboards.
- Buyer, Field Agent and Super Admin dashboards remain largely placeholder shells. Farmer opportunities, orders, settlement, notifications and settings remain explicit unavailable states. Operations lacks buyer-demand-to-fulfillment work.
- Existing structural tests are not end-to-end/browser tests. Full npm install, Prisma generate/validate, TypeScript build and database integration tests not certified.

## 4. Phased work breakdown (finish each gate before considering a module complete)

### P00 — Repository stabilization, dependency integrity and developer infrastructure
**Frontend:** establish baseline route inventory and common error/404/loading structure.
**Backend/infrastructure:** reconcile 4 stacked PRs, commit exact lockfile, pin dependencies, validate Prisma generators/migration history, env schema, CI, lint/typecheck/build/unit test jobs; configure preview environment and secrets discipline.
**Data:** schema map and migration order.
**Gate:** clean-clone install, Prisma validate/generate, typecheck, build, test, no client secrets, reproducible CI.

### P01 — Shared five-role design system and information architecture
**Frontend:** unified dashboard shell; role-driven sidebar; mobile navigation; breadcrumb/back behavior; top-bar notifications/profile; responsive tables/cards; empty/loading/error/success, confirmation dialogs; accessible form controls and status semantics.
**Backend:** signed-in actor/menu policies and a shared authorized data-fetching pattern; no leaking counts across tenants/roles.
**Gate:** accessible desktop/tablet/mobile review; no dead navigation; every role reaches profile/security/signout; never render a nonfunctional active control.

### P02 — Complete public website and agricultural catalogue UX
**Frontend:** Home, Platform, How It Works, For Buyers, For Farmers, About, Products, Product Details, FAQ, Insights, Contact, Terms/Privacy, Help; mobile nav, search, CTA, contact form and newsletter opt-in (only if backed by real service).
**Backend/data:** public approved category→product→variation→specification metadata; controlled visibility of supply vs request-only products; lead/contact submission protection, rate limits and consent; safe public SEO.
**Gate:** no false availability or supplier disclosure; all public CTAs lead to a real downstream route; legal/content review.

### P03 — Centralized authentication and complete account lifecycle
**Frontend:** all approved 48 auth/account paths and 144 UI states with Buyer/Farmer distinctions; email/phone, recovery, invite, re-auth, session, restriction and deletion-request UX.
**Backend:** Supabase SSR cookie session, trusted callback validation, idempotent auth↔profile reconciliation, signup/login/logout, safe password recovery, farmer SMS OTP throttling, email/phone changes, staff invitation acceptance; generic error messages; CSRF/origin/rate limits.
**Data:** Account, PhoneOtpThrottle, StaffInvitation, DeletionRequest, Auth Audit; safe migrations.
**Gate:** public signup cannot grant staff role; failed profile creation recoverable; all callbacks and session states tested with provider once configured; no fake successful verification.

### P04 — Staff identity, assignments, permission matrix and minimum Super Admin controls
**Frontend:** staff invitation list/detail, accept/revoke/resend, staff profile, assigned region/team/supervisor, account status and access denied views.
**Backend/data:** role+permission grants, record assignments, actor/reviewer separation, invite expiry/revocation, staff activity/audit, safe suspension/reactivation; bootstrap first Super Admin through restricted provisioning.
**Gate:** Field Agent accesses only assigned work; Operations permission-limited; restricted actions audited; unauthorized data never returned.

### P05 — Field Agent mobile-first workspace
**Frontend:** dashboard, assigned farmers, find/add farmer under authorized rules, field visit schedule/detail, start/complete visit, farm and crop inspection, photo/document evidence, upload progress, submitted reports, revisions, own staff profile.
**Backend/data:** FieldAssignment, FieldVisit, Inspection, InspectionFinding, EvidenceAttachment with private Supabase Storage references, validation and author scope.
**Gate:** actual assigned-only records; no self-approval; inspection evidence moves to Operations queue; lost-network/retry/duplicate submission handled.

### P06 — Farmer onboarding and comprehensive profile/crop/supply
**Frontend:** complete farmer home, verification checklist, owned farms, crop view/create/edit, expected harvest stages, physical supply creation/draft/revisions/detail/withdrawal request, documents, history, actionable feedback.
**Backend/data:** ownership policy, farm provenance, crop state changes, farm verification, supply review, quantity validation; no estimated harvest counted as stock.
**Gate:** farmer can complete every supported field and see Operations' decisions; independently verified inventory remains separate.

### P07 — Operations verification and supply-quality controls
**Frontend:** verification queues, evidence review, farmer/supply detail, request-info/reject/approve, assignments, filters/search/pagination, review histories and batch action safeguards.
**Backend/data:** review event history, two-person checks where required, evidence gates, grade/unit validation, provenance, concurrency-safe conditional updates.
**Gate:** reviewer cannot approve unqualified records; farmer sees accurate decision; approving supply does not automatically reserve stock or issue quotes.

### P08 — Buyer onboarding, business profile and procurement workspace
**Frontend:** buyer dashboard with 4 real metrics and next actions; buyer individual/business profile, location, contacts, review status, preferences, saved specifications.
**Backend/data:** BuyerOrganization/BusinessProfile and membership/representation permissions, profile verification events, authorized self-service updates.
**Gate:** buyers can access only their own organization's records; metrics do not show 0 on failed fetch; no false verified badge.

### P09 — Buyer requests and Operations demand queue
**Frontend:** catalog→request entry; requirement wizard (product variation/grade, quantity, delivery region, date), draft/review/submit, request history/detail/status, edit/clarification/cancel rules.
**Backend/data:** BuyerRequest and RequestLine, attachments, status history, demand assessment queue, SLA/task assignments and notifications.
**Gate:** buyer submits → Operations sees same record → Operations requests clarification → buyer corrects → Operations resumes; permissions verified end-to-end.

### P10 — Supply matching, farmer opportunities and official quotations
**Frontend:** Operations matching workspace, quantity/grade suitability, candidate supply, farmer invitation/interest where approved, quote builder/revisions/approval/expiry; buyer quote review/accept/decline.
**Backend/data:** MatchProposal, MatchAllocationCandidate, Opportunity, Interest, Quote, QuoteRevision, QuoteLine, ApprovalEvent; immutable issued quotation terms.
**Gate:** no match implies stock reservation; approved supply required; confidential supplier information protected; quote is accepted only within valid state/expiry and authorized buyer context.

### P11 — Orders, physical lots, reservations and stock movements
**Frontend:** pending-payment order, order detail/timeline, fulfillment summary, cancellation and exceptions.
**Backend/data:** Order, OrderLine, SupplyLot, StockMovement, Reservation, OrderStatusEvent; transactional quantity checks, expiry/release, reconciliation and idempotent processing.
**Gate:** concurrent requests cannot oversell; fulfilled stock is never restored by releasing reservations; orders cannot confirm by frontend redirect or mere quote acceptance.

### P12 — Payments, obligations and reconciliation
**Frontend:** buyer payment detail/checkout, processing/pending/failed/verified states, receipts, transaction history, disputes/refunds request UI.
**Backend/data:** Paystack server-owned initialization, signature-checked webhooks, server verification, idempotency keys, PaymentObligation, PaymentAttempt, ProviderEvent, Reconciliation, Refund; ledger and multi-currency controls.
**Gate:** only provider-verified amounts transition payment state; duplicate webhooks harmless; return URL never proves payment; financial exceptions and client terms approved before release.

### P13 — Fulfilment, pickup/delivery and buyer receipt
**Frontend:** operations fulfilment plan, pickup/dispatch/receipt, carrier records, status milestones, buyer receipt/issue submission, attachments, timeline.
**Backend/data:** FulfillmentPlan, Shipment, ShipmentLine, DeliveryEvent, ReceiptConfirmation, Issue/Dispute; signed/approved evidence and role checks.
**Gate:** split deliveries and shortages reconcile with order quantities; final receipt/dispute transitions follow approved policy.

### P14 — Supplier obligations, settlement and financial controls
**Frontend:** farmer payouts/settlements (not a fake stored-value wallet), finance/Operations review, bank details and actual settlement statement, payment status.
**Backend/data:** SupplierObligation, Settlement, SettlementAttempt, Reconciliation and audit; authorized approver separation; no autonomous payout without approved policy.
**Gate:** completed fulfilment does not imply settled payment; changes/failed payouts auditable; refund/remaining-balance/supplier ownership rules approved.

### P15 — Notifications, communication, support and account settings across roles
**Frontend:** in-app inbox with unread/read state, actionable deep links, settings, preferences, activity, support tickets, system error/permission states.
**Backend/data:** Notification, OutboxEvent, DeliveryAttempt, Preference, SupportCase and event handlers; email/SMS only where approved; de-duplicate messages.
**Gate:** cross-portal events notify the intended actor, link to authorized record, preserve status, and do not falsely mark business actions complete.

### P16 — Super Admin governance and operational reporting
**Frontend:** staff/roles/permissions, farmer/buyer directory, business review escalations, catalog governance, payment/dispute oversight, audits, configuration, KPIs, incident dashboard.
**Backend/data:** superadmin-only operations and immutable audit; reason-coded high-risk changes, reporting queries, aggregate metrics scoped correctly.
**Gate:** restricted actions documented and tested; Operations cannot self-elevate; reports reconcile with authoritative records.

### P17 — Integrated release engineering and full product acceptance
**Frontend:** UX polish, WCAG review, mobile field usability, performance, SEO, content and loading/error states, no dead links.
**Backend/testing:** CI matrix; staging Prisma migrate, RLS/access probes, API integration, Playwright E2E across five roles, webhook/retry/idempotency/reconciliation tests, security review and backup/rollback drills.
**Gate:** from genuine supplier onboarding through buyer demand, quotation, payment, fulfillment, issue resolution, settlement and audit, every role observes the correct transitions. Release to production only with stakeholder approval and operational configuration.

## 5. Route families to finish

- **Public:** `/`, `/product`, `/products`, `/products/[slug]`, `/how-it-works`, `/for-buyers`, `/for-farmers`, `/about`, `/insights`, `/faq`, `/contact`, legal/help.
- **Auth/account:** preserve 48 existing canonical routes; ensure every state/action contract has a backend mapping or clear feature-disabled handling.
- **Farmer:** `/farmer`, `/farmer/kyc`, `/farmer/my-supply/**`, `/farmer/opportunities/**`, `/farmer/orders/**`, `/farmer/wallet` (rename display label if approved), `/farmer/notifications`, `/farmer/settings`.
- **Field Agent:** `/field-agent`, assigned farmers, visits, inspections, evidence, reports, account/settings.
- **Operations:** `/operations`, verification, supply, catalogue, buyers, demand, matching, quotations, orders, payments, fulfilment, disputes, notifications, reporting.
- **Buyer:** `/dashboard`, `/dashboard/products/**`, `/dashboard/requests/**`, `/dashboard/quotes/**`, `/dashboard/orders/**`, `/dashboard/payments/**`, `/dashboard/settings`, notifications.
- **Super Admin:** `/admin`, staff/invitations/role grants, users, organization oversight, content/catalog, finance oversight, disputes, audits, reports, configuration.

*Routes not yet in code are proposed and must be reconciled before implementation; preserve compatibility redirects where needed.*

## 6. Mandatory cross-feature test journeys

1. Buyer signup → email confirmation → own dashboard; Farmer signup → email+one-time phone confirmation → farmer dashboard.
2. Duplicate callbacks, token expiry, recovery, resend and role forgery attempts never grant access.
3. Super Admin invites Field Agent → valid acceptance → assigned scope; revoke/expired invitations cannot activate accounts.
4. Farmer submits farm → Field Agent assigned visit → evidence → Operations decision → farmer sees correct status and can resubmit on request.
5. Farmer creates growing crop (not stock) → physical supply draft → Operations verified decision → only eligible stock can participate in matching.
6. Buyer chooses commodity specification → request → Operations clarification → buyer response → match → official quote → buyer decision.
7. Quote accepted → payment obligation → verified payment webhook → pending/confirmed order conditions satisfied; duplicate events have no second effect.
8. Two buyers compete for finite supply → one reservation succeeds within limits; rollback/release cannot replenish delivered units.
9. Operations organizes fulfilment → delivery/receipt → buyer issue/dispute → resolution → supplier obligation and settlement.
10. Every action tests success, insufficient permissions, invalid input, stale status, duplicate request, server failure, network retry and cross-role updates.

## 7. Completion labels (never inflate progress)

- **NOT STARTED:** no implementation.
- **UI BUILT:** route and interactive frontend present, backend action may be unavailable.
- **CODE COMPLETE:** server validation/policies, Prisma models, API and UI wired; tests pass locally; external provider not yet integrated.
- **STAGING VERIFIED:** actual test Supabase database/auth/storage, email/SMS/payment sandbox and browser E2E pass.
- **PRODUCTION READY:** security review, client approval, operational configuration, monitoring, rollback and required legal/commercial terms approved.

A module is **not "done"** solely because its files exist, a route renders, an API handler exists, or structural tests pass.

## 8. Open decisions that must not be fabricated

Supplier ownership and seller-of-record; stock custody, release/expiry; quote approval and pricing authority; payment balance timing; partial shipments; cancellation/refund/dispute rules; supplier payout eligibility; final legal text, staff scope and elevated administrative controls. Build UI/state scaffolds while recording these as policy gates, not fixed financial truths.

## 9. Activation prerequisites beyond the Supabase URL

Same-project `NEXT_PUBLIC_SUPABASE_URL`, publishable key, PostgreSQL pooled/direct URIs, server-only privileged credentials when truly needed, redirect allowlist and SMTP templates, SMS provider, secure storage buckets and policies, secrets, approved terms/privacy and domain, Prisma migrations, initial Super Admin provisioning, payment provider keys/webhook verification, automated staging acceptance tests, monitoring and backups.

## 10. First execution sequence

1. Complete P00, **before** expanding new business modules. Resolve stacked PR strategy and clean-build issues.
2. P01 shared dashboard shell and P03 auth hardening, with minimum P04 staff authorization.
3. P05–P07 complete the existing farmer/field verification vertical slice.
4. P02/P08/P09 build the actual public-to-buyer sourcing flow.
5. P10–P14 complete the commercial transaction loop behind approved business gates.
6. P15–P17 finish cross-role notification/governance and formal release testing.

**Do not advertise that the product will work merely by pasting a Supabase URL.** The objective is a thoroughly authored and validated system where remaining deployment inputs are explicit, minimal and testable.
