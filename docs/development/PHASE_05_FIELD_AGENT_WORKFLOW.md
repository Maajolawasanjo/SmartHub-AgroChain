# Phase 05 — Field Agent Visits, Evidence & Operations Review

## Scope and source boundary

The SmartHub AgroChain PRD V2.0 defines Field Agent work as on-ground verification/data collection: register farmers, collect farm/crop information, upload evidence, update field visit records and submit verification reports. It also requires an Operations review step and says a Field Agent must not independently approve their own verification. The PRD's mobile workflow is `Find Farmer → Register Farmer → Collect Farm Information → Collect Crop Information → Capture Evidence → Submit Verification → Operations Reviews` (PRD §§11.3 and 59).

This implementation delivers the scoped existing-farm visit/report workflow using Phase 04's active state assignments. It does not provision farmer accounts, approve farmer verification, approve supply, publish stock, or create orders. The PRD's “register farmer” step is deferred until an approved consent, duplicate-check and account-handoff flow is defined; a Field Agent cannot create a farmer Auth identity or change an account role through this workflow. Field visit purpose categories are an implementation taxonomy, not a new quality standard.

## Delivered

- Field Agent farmer/farm search, filtered server-side to the agent's active state assignments. Search is limited to existing farm records and does not expose farmer email or phone.
- Visit creation for an existing farm in the active scope; a visit stores the farmer/farm relationship and state is derived from the farm, never trusted from the client.
- Draft → in progress → submitted → Operations reviewed / returned for changes. Field Agent can update or cancel only their own editable visits. Returned reports can be corrected and resubmitted.
- Field observations for farmer presence, crop observations, production/stock observations, report notes and follow-up details. No GPS capture, commodity quality grade, automatic stock count or verification score is inferred.
- Private evidence upload for JPEG, PNG, WebP and PDF up to 10 MB per file. File type is checked against file signatures; storage object paths are server-generated. Evidence is not publicly readable, and evidence access uses short-lived signed URLs after authorization.
- Submission requires a report note and at least one completed evidence upload. Operations can accept the report or return it with a required note. Report acceptance is explicitly not farmer or supply approval.
- Status transitions and evidence actions create field event history and audit events. Mutations lock the agent account and re-check active state scope; status changes use guarded updates.
- Operations dashboard count and review queue for submitted reports.

## Routes

### Field Agent pages

- `/field-agent/farmers`
- `/field-agent/visits`
- `/field-agent/visits/new?farmId=...`
- `/field-agent/visits/[id]`
- `/field-agent/reports`

### Field Agent APIs

- `GET /api/field-agent/farms`
- `GET|POST /api/field-agent/visits`
- `GET|PATCH /api/field-agent/visits/[id]`
- `POST /api/field-agent/visits/[id]/start`
- `POST /api/field-agent/visits/[id]/submit`
- `POST /api/field-agent/visits/[id]/cancel`
- `POST|DELETE /api/field-agent/visits/[id]/evidence`
- `GET /api/field-agent/visits/[id]/evidence/[evidenceId]` — authorized redirect to a 60-second signed URL

### Operations pages/APIs

- `/operations/field-visits`
- `/operations/field-visits/[id]`
- `GET /api/operations/field-visits`
- `POST /api/operations/field-visits/[id]/review`
- `GET /api/operations/field-visits/[id]/evidence/[evidenceId]` — authorized redirect to a 60-second signed URL

## Data and migration

`prisma/migrations/20261104000000_field_agent_workflow/migration.sql` adds visit, evidence and event records; status and purpose enums; a composite farm/farmer foreign key; indexes; RLS and Data API grant revocation; and the private `field-visit-evidence` Supabase Storage bucket. The bucket accepts only JPEG/PNG/WebP/PDF with a 10 MB limit. The application uses the server-only Supabase secret key after route authorization. No migration has been applied.

The migration is for the dedicated SmartHub Supabase project only. Before deployment, review the SQL against the actual schema, apply the approved migration sequence, configure the private bucket and verify that no public Storage policy exists. Do not enable public bucket access.

## Release gates / limitations

- No SmartHub Supabase project or credentials are configured in this workspace. Database migration, real Storage upload/download, email/SMS behavior, and concurrent transaction tests remain staging gates.
- The Field Agent can access farm records within active assigned states. This is regional state-scope authorization, not a distinct per-farmer assignment system. Revoke or narrow scopes in Phase 04 if an agent should not see every farm in an assigned state.
- Farmer registration intake and account handoff are deferred; no Auth identity is created by a Field Agent.
- No GPS, offline queue, field-device capture, farmer signature/consent capture, crop/farm edits, supply approval, quality grading, or automated notifications are implemented.
- A Field Agent's visit report is evidence for Operations. Accepting it does not set `FarmerVerification.status` or `SupplyDeclaration.status`.
- Browser/mobile accessibility, real-device upload behavior, RLS validation and concurrency tests must be completed against staging before operational use.

## Verification

Run `npm run db:generate`, `npm run typecheck`, `npm test`, `npm run verify:syntax`, `npm run verify:foundation`, and `npm run build` in CI on the exact Phase 05 head. Database/Storage integration tests require the dedicated staging project and are not claimed by static checks.
