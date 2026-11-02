# Phase 2 — Farmer onboarding, crops, supply, and Operations review

**Status:** Implementation candidate on a feature branch; not connected to a live SmartHub Supabase project. Do not launch publicly until migration and integration tests pass.

## Source scope

The phase follows the approved consolidated Farmer Portal specification:
- registered farmer identity/email/phone verification is distinct from farm verification;
- growing crops and expected harvests never count as physical stock;
- supply drafts, submitted supply, Operations review and Approved-for-Matching are distinct;
- approval does not automatically create an order, reserve inventory, publish a public listing or generate a payment;
- all visible counts and records come from saved, user-authorized database queries.

## Included workflows

1. Farmer login → identity + one-time phone gating → Farmer dashboard.
2. Farmer dashboard → Farm Profile & Verification → add a farm → submit farmer verification.
3. Operations → farmer verification queue → see actual farm details → approve, request more information, or reject with a reason.
4. Farmer receives actual status/feedback → edits an eligible farm → resubmits.
5. Farmer → My Supply → Add Crop (optional estimated future harvest; no stock allocation).
6. Farmer → Add Available Supply (must link to owned farm and supported commodity) → Save Draft or Submit for Review.
7. Farmer → Review Status / Supply Detail → correct draft or information-requested supply and resubmit.
8. Operations → Supply Review → approve, request information, or reject with an auditable reason.
9. Operations → Commodity Catalog → configure real supported commodities (no fake records seeded).

## Primary routes

- `/farmer`
- `/farmer/kyc`, `/farmer/kyc/[farmId]`
- `/farmer/my-supply`, `/farmer/my-supply/crops`, `/farmer/my-supply/crops/new`, `/farmer/my-supply/crops/[id]`
- `/farmer/my-supply/available`, `/farmer/my-supply/available/new`, `/farmer/my-supply/available/[id]`
- `/farmer/my-supply/drafts`, `/farmer/my-supply/review-status`
- `/operations`, `/operations/verification`, `/operations/verification/[id]`, `/operations/supply`, `/operations/supply/[id]`, `/operations/catalog`

Other farmer navigation targets exist with explicit 'not enabled' states. They are NOT completed transaction, notification, opportunity, or payout modules.

## Authoritative API operations

- `POST /api/farmer/farms` → create owned farm
- `PATCH /api/farmer/farms/[id]` → update owned farm only while verification is editable
- `POST /api/farmer/verification` → submit/resubmit verification, after farm exists
- `POST /api/farmer/crops` → create crop on own farm, supported commodity
- `POST /api/farmer/supplies` → draft or submit available produce
- `PATCH /api/farmer/supplies/[id]` → revise draft, rejected or information-requested supply
- `POST /api/operations/reviews/verification/[id]` → review pending verification
- `POST /api/operations/reviews/supply/[id]` → review pending supply
- `POST /api/operations/commodities` → create supported catalog commodity

All mutations verify Origin, require an authenticated authorized role, validate input, and operate on trusted server-side user identifiers. Operations approvals use guarded updates and maintain decision-event histories. Unknown, owned-by-other and no-longer-actionable records are rejected. Data is never mocked. Sensitive records are not exposed to public product endpoints.

## Database and migration

`prisma/schema.prisma` is extended with `Commodity`, `Farm`, `FarmerVerification`, `FarmerVerificationEvent`, `FarmerCrop`, `SupplyDeclaration` and `SupplyReviewEvent`.

The migration `prisma/migrations/20261101000000_farmer_supply_ops/migration.sql` must be deployed **after** the existing auth migration, against a separate, approved SmartHub Supabase PostgreSQL instance. It enables RLS and removes Data API access for anon/authenticated roles. The Next.js server/Prisma connection uses trusted database credentials; NEVER expose them to the client.

**Not included:** stock reservations, duplicate-physical-lot detection, lot-grade inspection evidence, audited photo storage/upload, live notifications, buyer catalog publication, automated matching, quotations, buyer orders, farmer settlements, logistics, advanced field-agent assignment and financial reconciliation. Those require later approved domains. Images are NOT falsely represented as implemented.

## Release gates

- [x] Domain schema/migration authored, NOT applied.
- [x] Role and status guards authored.
- [x] Farmer + Operations routes and real-data empty states authored.
- [x] Structural and source syntax checks passed.
- [ ] npm dependency installation and lockfile generated.
- [ ] Prisma schema validation/generation on installed Prisma runtime.
- [ ] Full TypeScript check, Next.js build, browser E2E and responsive accessibility QA.
- [ ] Migration applied to a dedicated SmartHub staging Supabase project.
- [ ] Real farmer/Operations test accounts and role boundary penetration tests.
- [ ] Verification/status concurrency tests with a live PostgreSQL instance.
- [ ] Client review of supplier ownership and reservation rules before expanding supply approvals into purchasing.

This phase is **code-ready for integration testing, not production-activated**. The legacy live site and main branch must not be overwritten.
