# R01.3D.3A — Dormant Privileged MFA Enforcement and Safe Step-Up Path

**Status:** Implemented source and source tests; not an activated privileged MFA program and not a production acceptance. This subphase intentionally blocks all activation until owner decisions and recovery/coverage signoffs are recorded. Next steps are outlined below.

## Source requirements and existing boundaries

Private source: *SMARTHUB AGROCHAIN LTD — ADMIN DASHBOARD WEB IMPLEMENTATION*, Team & Access cross-module integration and Individual Permissions. Private source: *SMARTHUB AGROCHAIN ADMIN DASHBOARD MASTER REQUIREMENTS & IMPLEMENTATION TRACEABILITY REGISTER*, Team & Access approved addendum 91635 requiring mandatory privileged MFA at launch, two designated Super Admins with separate duties, two-person recovery wherever feasible, and no inherited financial approval from Super Admin title. Do not copy private client materials to the public repository or fabricate protected workbook row IDs.

Current application:
- `getAccountContext` checks the signed-in Supabase Auth identity and current authoritative `app_accounts` record.
- `requireSuperAdminPage` protects all nested `/admin` pages through the shared layout.
- `requireAdminApi` checks server-side active/email-verified account role and fixed capability matrix. It also allows some `OPERATIONS` capabilities; those remain pending separate privileged MFA policy.
- Other direct privileged routes and transaction services do NOT all delegate to the common guard.
- R01.3D.2 added an approval-gated TOTP enrollment and challenge API at `/api/admin/security/mfa/[action]` and a protected `/admin/security/mfa` UI. As long as the challenge UI lives **inside** the Admin layout, blanket AAL2 guarding would create a lockout loop.

## Implementation

1. `src/server/admin/privileged-mfa-enforcement.ts`: strict AAL2+current provider-verified TOTP check. It obtains fresh current session assurance and verified Auth factors via the signed-in Supabase server client. AAL1, missing factor, wrong factor type, unverified factor, provider error or missing assurance **deny**. No secret, factor ID or raw provider message is returned.
2. The switch `privilegedMfaEnforcementEnabled()` requires all of:
   - recorded owner `APPROVED` decisions for **R00-D01, R00-D04 and R00-D09**, each with decision reference, approver and date;
   - the existing `privilegedMfaPilotEnabled()` approval + server flag;
   - `ADMIN_MFA_ENFORCEMENT_ENABLED=true` (not set in the application);
   - `ADMIN_MFA_RECOVERY_SIGNOFF=true` after tested lost-factor recovery;
   - `ADMIN_MFA_ALL_ENTRYPOINTS_SIGNOFF=true` after auditing all direct privileged service/API paths.
   
   **Every owner gate is currently PENDING**, and no signoffs or flags were set in a deployment. The switch remains false regardless of one environment variable.
3. `src/server/admin/guard.ts`: the current fixed permission matrix and account checks remain authoritative; when AND ONLY WHEN the complete switch is enabled, an active `SUPER_ADMIN` session without fresh verified AAL2 is redirected from protected pages to `/account/security/mfa`, or rejected by `requireAdminApi` with 403. No bypass for an admin with failed provider observations. Because rollout identity scope is limited to the current Super Admin role, **OPERATIONS is not claimed covered**.
4. `src/app/account/security/mfa/page.tsx`: a dedicated, independent, authenticated and email-verified Super Admin step-up/enrollment page **outside** the `/admin` layout, allowing an AAL1 user to challenge or begin approved pilot enrollment. It cannot authorize an Admin operation, cannot reset verified factors, and cannot bypass account status/role. Provider lookup is skipped entirely before pilot approval; it fails closed when MFA factor status is unavailable.
5. `src/server/admin/privileged-recovery-review.ts`: **non-executable** human-review preconditions for an independently verified identity, time-bounded incident with at least two distinct approved, separately authenticated recovery officers. Rejects self-approval, duplicate approval, rejected incident, unverified identity, expired records, missing justification, and insufficient approvals. This module does **not** call Supabase Auth, create approved authority or reset/remove factors.
6. `tests/r01-3d3a-privileged-mfa-guard-and-recovery.test.mjs`: executable negative tests for pending gates, multiple approval/flag combinations, AAL1/unknown/invalid factor, lockout-safe route, current guard preservation, and independent recovery.

## Critical gaps before enforcement switch activation

This PR is **not** sufficient for `ADMIN_MFA_ALL_ENTRYPOINTS_SIGNOFF=true`. A complete reviewed inventory and proof of enforcement is still needed:

| Entry-point category | Existing guard | R01.3D.3A status |
| --- | --- | --- |
| All `/admin/**` pages | `requireSuperAdminPage` through layout, direct page checks | Dormant AAL2 boundary added |
| `requireAdminApi` clients where role is `SUPER_ADMIN` | Fixed role matrix, account status, email | Dormant AAL2 boundary added |
| `/api/admin/staff/invite` | Dedicated active Super Admin check and password verification | **Separate direct route — NOT yet AAL2 integrated** |
| Refund case review services | Direct specialized financial guard | **Not covered; R00-D09 maker/checker required** |
| Supplier obligation approval and transfer reconciliation | Specialized `superAdminActor()` checks | **Not covered; R00-D09 required** |
| Other privileged report, staff, governance and support services using direct Super Admin checks | Route-specific policies | **Inventory and integration pending** |
| `OPERATIONS` Admin API capabilities | Fixed Operations role | **Not in this Super Admin-only rollout; phased MFA policy required** |
| MFA challenge and enrollment endpoint | Active Super Admin + trusted Origin + R00-D04 pilot gate | Must remain reachable while AAL1; does not grant business privileges |
| `/account/security/mfa` step-up | Authenticated current Super Admin and live account status | Accessible to AAL1; **no implicit authorization** |
| Lost-factor or account-recovery execution | Existing password recovery does not remove verified MFA factors | **Unimplemented; no self-service bypass** |

**Do not claim organization-wide mandatory MFA is active or all privileged APIs are protected.** In particular, existing financial and direct-auth endpoints must be audited, tested and joined to the final step-up policy before any deployment toggles. The recovery simulator is not an approved emergency credential reset tool.

## R00 governance and production criteria

- **R00-D01:** integrated/separate Admin architecture, Auth ownership, session assurance consistency and migration boundaries.
- **R00-D04:** designated Super Admin role separation, actual verified officers and two-person recovery process, MFA enrollment/recovery, safe lost-factor procedures, session revocation, incident audit and fallback.
- **R00-D09:** independent financial maker/checker, sensitive action reauthentication and privilege exceptions.
- The protected 102-row requirement workbook remains unavailable as an editable artifact. No IDs or acceptance checkboxes are inferred.
- Vercel previously reported build-rate-limit failures; production deployment must be independently verified before claiming live behavior.

## Verification checklist

**For this source milestone:** successful Node source tests, Prisma validation, TypeScript, Next.js build, desktop/mobile public browser regressions, PR review and merge.

**For operational acceptance (not included):** isolated real test identities at AAL1/AAL2, one verified and two verified factors, wrong codes and repeated failures, new and revoked sessions, suspended accounts, missing factors, Supabase outage/timeout, broken/expired recovery requests, independent officers, all Admin/direct financial API denials, Operations phased rollout, full route inventory, audited session invalidation, source-to-database grants, user experience under exact intended Vercel deployment, and owner signoff.

**Next development subphase R01.3D.3B:** direct-route inventory and specialized financial/staff API MFA boundary integration, with explicit maker/checker governance, staged negative tests and no premature enforcement activation.
