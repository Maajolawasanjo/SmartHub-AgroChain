# Phase 06 — Farmer Onboarding, Crop Progress and Physical Supply

## Scope and existing work reused

This phase extends the existing farmer/Operations vertical slice already delivered in the original Phase 2 and merged into `main` in Phases 00–05. It **does not duplicate** the existing `Farm`, `FarmerVerification`, `FarmerCrop`, `SupplyDeclaration`, `SupplyReviewEvent` or `FarmerVerificationEvent` tables. It follows the client Farmer Portal Specification and the Master Implementation Roadmap's P06 boundary.

Existing workflows retained: verified farmer access, owned farm creation/editing, farmer verification submission, Operations review, crop creation, physical supply drafts/submission/editing and Operations supply review. Verified farmer status remains separate from stock approval and from payment/fulfilment.

## Added/strengthened

- Crop progress edit via `PATCH /api/farmer/crops/[id]`, on the existing crop detail page. Only the farmer owner may edit. The original farm and commodity remain immutable; changes use an exact `updatedAt` version guard and audit event. A harvested crop linked to a non-withdrawn supply cannot be reverted to growing/planned. Editing a crop never changes physical supply.
- Crop detail shows actual planting, expected harvest, yield estimate, stage and notes. A link to declare harvested supply prefills **only** the owned source crop, farm, commodity and variety; physical quantity and condition remain blank and must be entered independently.
- Supply form filters source crop options by the selected owned farm and commodity. Existing stock can be declared without a crop. Save Draft and Submit for Review remain distinct. Submission requires verified farmer status; no buyer publication or reservation is implied.
- Farmer may withdraw **DRAFT** or **PENDING_REVIEW** supply with a required reason through `POST /api/farmer/supplies/[id]/withdraw`. The guarded transaction records `WITHDRAWN` and the review event/audit. Approved, returned/rejected or already-withdrawn supply cannot be withdrawn by this endpoint. Operations must handle approved-supply reversals under a future policy.
- Farmer dashboard now shows actual farm/crop/supply counts, nearest expected harvest, pending/approved supply counts, and three latest owned crop/verification/supply events. Transactions and opportunities remain explicitly unavailable rather than displaying invented zeroes or matches.
- My Supply overview distinguishes crop records, supply declarations, drafts, pending review, approved-for-matching and needs-attention states. Supply details display actual saved attributes, review feedback, withdrawal option where permitted and event history.
- Farm Profile & Verification now displays authenticated account contact information, saved farms, real verification status/history and an onboarding checklist. Settings presents current defaults and account/security links without claiming unsupported preferences or delivery channels are persisted.
- Same-origin checks, server-side role/owner checks, atomic state guards, input validation and audit events cover the new mutations.

## Routes and backend

- Existing: `/farmer`, `/farmer/kyc`, `/farmer/my-supply`, `/farmer/my-supply/crops/[id]`, `/farmer/my-supply/available/[id]`, `/farmer/settings`.
- Added: `PATCH /api/farmer/crops/[id]`; `POST /api/farmer/supplies/[id]/withdraw`.
- Reused: `/api/farmer/farms`, `/api/farmer/verification`, `/api/farmer/crops`, `/api/farmer/supplies`, and Operations verification/review endpoints.
- **No new database migration:** existing `CropStage`, `SupplyReviewStatus.WITHDRAWN`, event tables and audit table are sufficient for these actions. Previously authored migrations remain unapplied until staging.

## Limitations and release gates

1. No dedicated Supabase staging project/credentials. The previous and current migrations have **not** been applied. Database, RLS, Supabase Auth, Storage and cross-role E2E testing cannot be claimed as complete.
2. Drafts currently require the existing schema's mandatory supply fields; partial/empty drafts need an approved data-model change. Crop and supply photos, verification documents and broader farmer profile fields need a dedicated private storage/data policy and migration.
3. Farmer account name/phone/email changes are governed by the authentication flow, not directly editable in Farm Profile. Business registration identifiers and identity documents are not fabricated or stored in unapproved columns.
4. Farm changes remain locked during pending/verified review under the existing policy; new farms after verification need an Operations-approved re-verification rule.
5. Buyer demand/opportunities, orders, stock reservations, fulfilment, payments, settlement, notification delivery and persistent localization preferences remain later phases. Approved supply is **not** reserved or sold stock.
6. Field Agent self-service farmer registration remains deferred pending consent, duplicate detection and secure account handoff. The agent's accepted visit report is not itself a farmer/supply approval.
7. Before production: run `npm ci`, Prisma generate/validate, typecheck, tests, Next build; apply migrations to a disposable staging project, validate RLS/ownership/concurrency and browser/mobile journeys for farmer→agent→Operations→farmer.

## Acceptance scenarios for staging

- Farmer A cannot fetch/edit Farmer B's crop or withdraw Farmer B's supply; unauthenticated, suspended and unverified-phone accounts are rejected.
- Two browser sessions edit the same crop: stale edit returns conflict; latest changes remain intact.
- Farmer with linked physical supply cannot revert a harvested crop to planned/growing; no crop edit creates or changes supply.
- New supply from a crop preselects farm/commodity/source but not physical quantity; existing stock can be declared without a crop.
- Draft/pending withdrawal saves a reason and event; simultaneous Operations review/withdrawal has only one winning transition; approved supply cannot be self-withdrawn.
- Operations review feedback and event history appear on the farmer's own portal; no invented opportunities, transaction totals or balances appear.
