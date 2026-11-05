# Phase 17 — Integrated release engineering and full-product acceptance

**Status:** Phase 17 code and test harness on `feat/phase-17-integrated-release`, stacked on Phase 16 PR #21. **NOT** a production-readiness certificate. No SmartHub-named Supabase project, staging deployment or stage test-user set was available in connected resources on 5 November 2026. Other connected projects must never be used as substitutes.

## 1. Branch and environment release boundary
- Merge previously reviewed draft PRs in their correct order before a staging release (Phase 06 PR #11 through Phase 16 PR #21; Phase 17 PR follows Phase 16). Do not cherry-pick migrations out of order or assume a green stacked PR means the main branch already contains it.
- Create a dedicated, non-production SmartHub Supabase project and staging deployment. Run all authored Prisma migrations against THAT project only. Do not connect staging scripts to another company's or product's Supabase project.
- Configure a protected GitHub Actions environment **`staging`** with required reviewer approval. The manual `.github/workflows/staging-acceptance.yml` becomes dispatchable after the workflow is present on the repository default branch. It never runs on ordinary push/PR.
- Stage target proof: 20-character project ref, exact matching HTTPS Supabase project URL, matching PostgreSQL `db.<ref>.supabase.co` direct migration URL and same-project runtime DB host/user, and a separately approved HTTPS hostname whose name contains `staging`, `preview` or `git-`. A different production origin must be supplied for explicit comparison. Missing or mismatched values cause immediate failure.
- During staging acceptance keep `SUPPLIER_PAYOUTS_ENABLED=false`, `PUBLIC_SIGNUP_ENABLED=false` and Paystack keys test-only (`sk_test_` prefix). Buyer checkout may be tested in a separately controlled provider sandbox; no live customer payments/transfers are allowed.

## 2. Protected Actions environment variables and secrets
Create approved **environment vars** (not in source):
- `SMART_HUB_STAGE_SUPABASE_REF` — the dedicated staging project ref; `SMART_HUB_STAGING_SUPABASE_URL` — matching `https://<ref>.supabase.co`; `SMART_HUB_STAGING_BASE_URL` — the actual HTTPS staging deployment; `SMART_HUB_STAGE_REVIEWED_ORIGIN` — independently reviewed exact origin; `SMART_HUB_PRODUCTION_BASE_URL` — the separately deployed production origin.
- `STAGING_BUYER_A_SHIPMENT_ID` and `STAGING_BUYER_A_SUPPORT_CASE_ID` — **genuine** staging-only Buyer A resources, preprovisioned with correct source evidence and buyer ownership; never made up from fake business records. Buyer B must be a distinct organization.
- `STAGING_MIGRATIONS_APPROVED=true` — only after the migration list and backup/restore drill have been reviewed.

Store only in **environment secrets**:
- `SMART_HUB_STAGING_DIRECT_URL` and `SMART_HUB_STAGING_DATABASE_URL` (staging PostgreSQL credentials); `SMART_HUB_STAGING_SUPABASE_PUBLISHABLE_KEY`; optional `SMART_HUB_STAGING_PAYSTACK_SECRET_KEY` (`sk_test_...` only); `SMART_HUB_STAGING_READINESS_TOKEN` (random >=32 chars).
- `STAGING_SESSION_BUYER_A`, `STAGING_SESSION_BUYER_B`, `STAGING_SESSION_FARMER`, `STAGING_SESSION_FIELD_AGENT`, `STAGING_SESSION_OPERATIONS`, `STAGING_SESSION_SUPER_ADMIN` — disposable, verified, staging-only web session cookie headers. Rotate/expire immediately after acceptance; never print them. These test users require independent organization membership, correct roles, verified contact as applicable, and real seeded staging records.
- `STAGING_BACKUP_RESTORE_EVIDENCE` — reviewed evidence reference identifying a RECENT successful staging backup and isolated restore drill. The workflow checks that it exists; the human reviewer must verify its validity.

**Deploy the staging app** with matching public Supabase URL and key, private runtime DB URL and appropriate app identity; set `RELEASE_ACCEPTANCE_ENABLED=true` and `RELEASE_HEALTH_TOKEN` equal to the reviewed staging readiness token. The protected `/api/internal/readiness` path returns 404 unless enabled with a matching bearer token, and returns 503 if identity config or DB ping is not healthy. Do not enable this probe on production.

## 3. Automated gates added by Phase 17
1. **Existing normal CI**: clean npm dependency install from committed lockfile, Prisma client/schema validation, TypeScript, source/contract tests, Next.js production build.
2. **Manual `staging-acceptance` job**: matching target preflight BEFORE any staging DB action; no production host or provider test/live key confusion.
3. **Explicit migration approval**: `workflow_dispatch` option `apply_migrations` (false by default); when true requires protected environment approval, `STAGING_MIGRATIONS_APPROVED=true` and reviewed backup/restore evidence. Only then runs existing `npm run db:migrate` (`prisma migrate deploy`). The job does not auto-run `prisma migrate reset`, `db push`, destructive cleanup or production rollback.
4. **Read-only Postgres verification**: checksum-checked migration history against every repository migration, no unknown/failed migrations, all mapped Prisma tables exist with RLS, sensitive tables are not accessible to `anon`/`authenticated`, all evidence storage buckets remain private, supplier obligations that claim SETTLED have provider-verified attempts, source lots conserve quantities, split shipments do not exceed purchased quantities, and no completed order remains with an unresolved delivery issue.
5. **Read-only HTTP authorization probes**: anonymous denied from protected routes, all five real roles can enter their own workspace but not each other's, Super Admin CSV is inaccessible to Operations/anonymous, and Buyer B cannot access Buyer A's authentic shipment/support case. The protected app readiness endpoint is also verified.
6. **Pinned Chromium browser verification**: the manual workflow temporarily installs `@playwright/test@1.64.1` in its ephemeral job (not into the project's dependency lockfile) and runs `e2e/staging.acceptance.spec.mjs`. Covers role homepages, authenticated headings, narrow mobile overflow and keyboard focus, Super Admin finance/governance, Buyer/Farmer inbox and support, cross-role restrictions, and Buyer A/B isolation. Browser screenshots/traces/videos are disabled to avoid publishing private fixture data.

**Automated stage checks are read-only except for explicitly approved staging schema migration.** They do not initiate money transfers, refund actions, buyer receipts, farmer settlement, role changes or actual physical dispatch.

## 4. Release blocker corrected
- An authenticated buyer can report a delivery discrepancy within the stated seven-day window AFTER apparently complete receipt. Previously, the shipment and plan entered investigation but the order could still appear `COMPLETED`. Phase 17 adds `DELIVERY_REVIEW`; reportIssue now atomically moves relevant `FULFILLING` or `COMPLETED` orders into review, records an OrderStatusEvent and sends staff alerts. Supplier payout approval/transfer remains blocked because the established settlement guard requires clean `COMPLETED` status, PAID buyer obligation and no delivery issue.
- A changed provider verification status discovered even after `COMPLETED` now freezes the order as `PAYMENT_REVIEW`; no automatic stock reversal, refund or transfer recall is claimed.
- These are strict safety states. A client-approved dispute adjudication, inventory adjustment and post-settlement recovery process is required before a real production dispute can be closed.

## 5. Mandatory **human-executed** integration tests still required
These must be carried out in an isolated, approved staging environment with real provider TEST keys and user accounts, not declared passed from static code:
- **Farmer**: contact verification, KYC submission, active Field Agent assignment, genuine field visit, authenticated private evidence storage, farmer crop and physical supply declaration.
- **Operations**: independent farmer/inspection verification, supply approval, source lot quantities, buyer request assignment, sourcing match, farmer opportunity, official quote version and Super Admin independent approval.
- **Buyer**: real separate buyer organization A and B, sourcing request revisions, quote acceptance, reservation stock ceilings, Paystack TEST checkout, callback not proof, successful provider verification, duplicate signed webhook, timeout/late webhook, incorrect amount and concurrent cancellation versus provider settlement.
- **Logistics**: split shipments, private evidence for pickup/dispatch/arrival, buyer-attested complete and partial physical receipts, disputed goods held separately, per-lot stock movement conservation, owner-only receipt, no over-allocation under concurrent requests.
- **Supplier finance**: agreed farmer-specific prices, verified encrypted bank details, independent Super Admin payable approval (never proposer self-approval), Paystack TEST transfer initiation/OTP/timeout/duplicate verification, payout event updates only from provider confirmation, bank settlement reconciliation.
- **Exceptions**: provider reversal after `PAYMENT_VERIFIED` and after `COMPLETED`, buyer issue after order completion, refund case, unresolved supplier payout blocking, auditable escalation, support internal-note isolation and governance review version conflicts.
- **Security**: real JWTs for all five roles; suspended accounts, withdrawn permissions and member changes; mismatched organizations; malicious request IDs; CSRF/origin enforcement; signed webhook validation and replay; Storage bucket attempts with anonymous and authenticated public keys; no access to Supabase secret and encrypted farmer bank numbers.
- **Access & accessibility**: keyboard tab order, focus visibility, navigation disclosure, responsive mobile 360/390/768/1440px, image alternatives, contrast, form error announcements, network timeout/retry states, and cross-browser Chrome/Firefox/WebKit after approved preview is live.
- **Reliability and incident response**: webhook delivery backpressure, dedupe and dead-letter/alert policy, financial exception alerting, backups and *actual isolated restore*, operational runbook, audit log retention and redaction, performance query plans/pagination, deployment rollback testing, supplier reconciliation monitoring.

## 6. Go/no-go signoff
- Engineering owner: all staged database, HTTP and browser checks green on the exact release commit, migrations audited, no secret exposure, no open P0/P1 defects.
- Operations lead: acceptable genuine sourcing, physical custody, partial receipt and dispute workflows, supervised field-agent experience and staff accountability.
- Finance/commercial lead: seller-of-record, pricing, VAT/tax, fees, payee consent, refunds/reversals, transfer reconciliation and liability signed off; Paystack production credentials must remain disabled until approved.
- Security/privacy lead: RLS, Storage, JWT, role scope, deletion/retention and disaster recovery verified.
- Product/client owner: all five role portals accepted with actual staging test data, and written go/no-go approval.
- Approvals and evidence are stored externally in approved issue tracking and deployment runbooks; no feature branch, CI result or static code represents this approval by itself.

## 7. Rollback and recovery
- If migrations fail, **stop**. Do not run `prisma migrate reset` or drop a real database. Preserve logs, quarantine new writes and investigate migration history drift.
- Prior to migrations, take a verified snapshot/backup and perform a restore to an isolated test project/DB; identify RPO/RTO and emergency access role. The workflow checks a human-reviewed evidence reference but does **not** create or verify that backup by itself.
- For application regression, restore the previously known good release build/alias while protecting data compatibility; a database downgrade is not automatic. If schema is incompatible, maintain a read-only incident gate and apply a reviewed forward repair rather than blindly reverting SQL.
- For financial exceptions, disable new checkouts/transfers at server environment gates, notify responsible finance staff, reconcile independently with Paystack and the bank, and never mark funds paid/refunded manually.

## 8. What is NOT completed
No dedicated SmartHub Supabase staging project was available in the currently connected projects; therefore **no** migrations, actual RLS probes, staging browser sessions, Playwright acceptance run, provider test transactions, backup restore, performance load test or final production signoff has happened. The manual workflow must be configured with an approved staging environment after stacked code is reviewed and merged. Automated source/CI success certifies code checks only.