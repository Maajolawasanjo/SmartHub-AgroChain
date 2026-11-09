# R01.3D.3B — Specialist Privileged API MFA Coverage

**Implementation:** Dormant, additional server-derived MFA checks on existing privileged service entry points, not a role or finance-policy change. **Release state:** pending R00-D01, R00-D04, R00-D09 and actual Supabase Auth test evidence. No production claim.

## Client requirements and prior implementation

Private sources: SmartHub AgroChain Admin Dashboard Web Implementation, Team & Access Cross-Module Integration and Individual Permissions (scope, separate approvers and MFA); SmartHub AgroChain Admin Dashboard Master Requirements & Implementation Traceability Register, integration addendum 91635 (two designated Super Admin duties, privileged MFA, independent finance maker/checker, recovery approval). The protected 102-row workbook is not available to write and exact requirement IDs must not be inferred.

Previous R01.3D.3A introduced a dormant, fail-closed AAL2 + verified TOTP check in `requireSuperAdminPage` and `requireAdminApi` and an AAL1-accessible step-up page. However, **not all Admin API routes call `requireAdminApi`**. Specialized role checks in finance and a direct staff-invitation route could bypass the extra MFA layer if enforcement later became active.

## Code audit and this increment

| Privileged operation | Original server authorization | New additive MFA boundary | Activation state |
| --- | --- | --- | --- |
| `/admin/**` pages | `requireSuperAdminPage` + layout | From D.3A: conditional AAL2 | Dormant |
| Admin routes using `requireAdminApi` | Current fixed role/capability matrix | From D.3A: Super Admin conditional AAL2 | Dormant |
| Direct `POST /api/admin/staff/invite` | Same-origin, active verified SUPER_ADMIN, password reconfirmation, fixed invited staff roles | `requirePrivilegedMfaForSuperAdminActor(ctx)` after current role guard, **before** invitation reservation and Auth admin invitation | Dormant |
| `approveSupplierObligation` | `superAdminActor`, independent proposer, verified bank and completed-order consistency | Shared `superAdminActor()` now also invokes additive AAL2 | Dormant |
| `adminReconcileTransfer` | `superAdminActor`, provider-backed status and unique reference matching | Shared `superAdminActor()` now also invokes additive AAL2 | Dormant |
| `reviewRefundCase` | `financeActor`, then SUPER_ADMIN role restriction; review only, not provider payout | Shared `financeActor()` invokes additive AAL2 **for SUPER_ADMIN only** | Dormant |
| Other payment reconciliation using `financeActor` | Existing Operations/finance account and record scope | Same additional Super Admin AAL2 when applicable | Dormant |
| `OPERATIONS` settlement initiation / reconciliation | `operationsActor`, assigned scope, distinct maker/checker and provider gates | **Unchanged** — needs independently governed Operations MFA enrollment/challenge and explicit rollout | Not covered |
| Account-level password/email, phone, other-session revocation, recovery | Account-specific provider verification + password confirmation | **Not covered by this change**; recovery cannot be blocked by blanket AAL2 without an approved exception path | Pending |
| Webhooks or external provider callbacks | Provider signatures and transaction reconciliation | Not user-session MFA endpoints; retain signed-event/provider policies | Not applicable |

No existing privileges, fixed role matrix, independent financial conditions, bank validations, maker/checker separation, provider proof, or payment launch flags were removed or altered.

## Implementation

- `src/server/admin/privileged-actor-mfa.ts`: a narrowly scoped additive helper. When `privilegedMfaEnforcementEnabled()` is false, it performs **no** Auth factor query and preserves current app behavior. When true, it rechecks role, ACTIVE account, verified provider email, matching signed-in provider account, and invokes `inspectCurrentPrivilegedMfaAccess()` to require current AAL2 **and** a verified TOTP factor. Missing evidence returns a generic 403, not a new role or approval.
- `src/server/settlements/common.ts`: existing `superAdminActor()` role check remains; MFA helper runs before returning actor context to supplier approval and Admin transfer-reconciliation service functions.
- `src/server/payments/common.ts`: `financeActor()` retains fixed permission check and invokes the helper only when caller is already `SUPER_ADMIN`. No Operations MFA change or automatic finance authority.
- `src/app/api/admin/staff/invite/route.ts`: after existing active SUPER_ADMIN and origin checks, checks additive MFA before any invitation, database reservation or provider call. Password reconfirmation and fixed invited roles remain unchanged.
- `tests/r01-3d3b-specialist-mfa-coverage.test.mjs`: executable denial/allow simulations, inactive/mismatched identity tests, code-path tests verifying all specialist callers, unchanged financial segregation and no new Auth grants.

## Non-negotiable activation blockers

The entire R01.3D.3B implementation remains dormant under the source-controlled `R00-D01`, `R00-D04`, `R00-D09` PENDING decisions. Existing D.3A additionally requires an approved pilot and server-side `ADMIN_MFA_ENFORCEMENT_ENABLED`, `ADMIN_MFA_RECOVERY_SIGNOFF` and `ADMIN_MFA_ALL_ENTRYPOINTS_SIGNOFF`. **No flags or gate records are changed in this PR.**

The all-entrypoints signoff must NOT be set based solely on this code: Operations authorization, direct account security actions, support/admin exceptions, root Admin route inventory, service-to-service identities and error paths still require review. Lost-factor support must work without an AAL2 circular dependency; this release has a non-executable recovery-review contract but not an approved recovery operation. AAL2 is not a substitute for financial segregation or approval.

### Separate Operations MFA milestone

To enforce MFA for Operations, the approved policy must identify which Operations actions need AAL2, how assigned staff enroll TOTP, where AAL1 staff complete step-up **outside** protected layouts, how recovery and session revocation work, and how provider/record scope is rechecked after factor verification. Do not simply apply the Super Admin-only pilot to Operations or infer permission from the staff role.

### Acceptance requirements

- CI: Node security and contract tests, Prisma validation, TypeScript, Next.js production build, public desktop/mobile browser checks, and reviewed merge to main.
- Required *future* integration: staged Supabase AAL1/AAL2 authenticated staff and Super Admin accounts, failed/offline MFA, account suspension, lost TOTP device, new/revoked sessions, provider timeout, cross-role access, separate maker/checker, full API inventory, real financial provider test transactions with launch flags safely disabled and activity logs.
- Vercel deployments have reported build-rate-limit errors in previous milestones. Source CI passing is not evidence of production deployment or operational MFA acceptance.

**Next:** R01.3D.3C Operations MFA pilot and direct account-security route coverage / complete authorized endpoint inventory, followed by owner decisions, controlled rollout and production acceptance.
