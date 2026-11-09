# R01.3D.3E — Current-Identity Support Read Boundary and Isolated MFA Acceptance

**Release state:** source change only. Neither mandatory MFA nor recovery-factor removal is live. No real MFA test user, existing Auth factor, database schema, role, finance authority or live deployment was modified.

## Source and prior gates

- SmartHub private Admin Dashboard Web Implementation, Team & Access, role-scoped sensitive records, audit and MFA requirements.
- SmartHub private Admin Dashboard Master Requirements and Traceability Register: two independent Super Admin responsibilities, privileged MFA, independently approved finance authority and documented lost-factor recovery.
- Prior R01.3D.3D inventoried 96 App Router route handlers and added dormant MFA for privileged support *mutations* and shipment-evidence staff access. **Sensitive support-case list and details remained able to trust a passed account-like object.**
- R00-D01, R00-D04 and R00-D09 still read `PENDING_OWNER_DECISION` in `r00-gates.json`. Existing privileged MFA enforcement flags are not activated.

## Concrete changes

1. `src/server/communications/staff-mfa.ts` adds `canReadPrivilegedSupportCases(ctx)`, which first checks the authoritative account id matches the verified provider user, status ACTIVE and confirmed email. It returns `false` for Buyer/Farmer/Field Agent. For Operations and Super Admin it retains the existing staff read scope **while their respective rollout gate remains disabled** (without querying factors). Once enforcement is approved, it reads current Supabase Auth MFA AAL and verified TOTP evidence via the existing fail-closed inspector; provider errors/AAL1/missing verified factor return `false`, reducing read scope to the staff user's *own* support cases.
2. `src/server/communications/support.ts`: `supportCaseList` and `supportCaseDetail` now **independently call `requireWorkspaceAccount`** to obtain trusted current Supabase identity and database role. The legacy account argument is checked only for equality with that authoritative identity, not used to grant access. Staff read privileges require the new role-specific MFA decision; otherwise the DB query is constrained to `openedById=currentAccount.id` and `messages.where={internal:false}`. Unauthorized IDs cannot be used to reveal other customers' case details or private notes.
3. `src/app/support/page.tsx`, `src/app/support/cases/[id]/page.tsx`: the UI's staff list, case state controls, ability to view internal notes and internal-note posting are driven by that same derived staff read decision. When future enforcement is active but AAL1, staff see their own support cases and a link to the correct step-up route. This preserves a lost-device support conversation instead of creating a lockout loop.
4. `scripts/release/check-stage-mfa-readonly.mjs`: a strictly **read-only** provider observation harness for **two separate, disposable staging identities**, one already at AAL1 and one independently at AAL2. Uses `auth.getUser(jwt)` to verify each token against **the reviewed staging GoTrue server** and `mfa.getAuthenticatorAssuranceLevel(jwt)` for its actual level. Refuses missing explicit stage consent, any production-equivalent or unexpected host, production-vs-stage ref reuse, HTTP, enabled payment/payout flags, missing or identical tokens. No service-role key, database URL, cookies, token refresh, Auth mutations or factor-challenge writes are needed. Never prints JWTs, user IDs, factor IDs, email or provider payloads.
5. `.github/workflows/staging-mfa-readonly.yml`: **manual-only** `workflow_dispatch` in the protected `staging` environment, requiring explicit isolated-staging confirmation and two disposable session token secrets. This workflow is **not** part of the automatic CI build or live release. Do not trigger without securely prepared isolated accounts; missing secrets cause a hard failure, not a false pass.
6. `tests/r01-3d3e-support-reads-staging-mfa.test.mjs`: denied/mismatched/expired read scenarios, source-level DB scope checks, role-specific AAL2 simulation, fail-closed provider behavior, mocked two-user provider acceptance, and stage-target/production-refusal tests. The previous cross-portal test harness was adjusted to parse the expanded read policy without any live provider call.

## Live acceptance is still missing

This PR does **not** exercise Supabase against actual staging users. To run the dedicated manual staging probe, an authorized operator must:
- establish a disposable, isolated **staging** Supabase project and review its reference versus the production project ref;
- enroll and verify TOTP for one staging test identity to AAL2, and separately establish another disposable AAL1 identity;
- configure the protected staging GitHub Environment values `SMART_HUB_STAGE_SUPABASE_REF`, `SMART_HUB_PRODUCTION_SUPABASE_REF`, `SMART_HUB_STAGING_SUPABASE_URL`, and secrets `SMART_HUB_STAGING_SUPABASE_PUBLISHABLE_KEY`, `STAGING_MFA_AAL1_ACCESS_TOKEN`, `STAGING_MFA_AAL2_ACCESS_TOKEN`;
- manually trigger **Isolated staging MFA read-only acceptance** with the isolation confirmation, inspect GitHub Actions results and record evidence. Expired sessions must fail; never copy production tokens into staging.
- extend the acceptance to challenge failures, factor revocation, expired credentials, account suspension, horizontal cases, browser session refresh, and signed-in API denials. The read-only probe is just one observation; it does **not** approve mandatory MFA.

Provider sources verified November 9 2026: https://supabase.com/docs/guides/auth/auth-mfa and https://supabase.com/docs/reference/javascript/auth-mfa-getauthenticatorassurancelevel. The Supabase MFA documentation warns that AAL1/AAL2 must be distinguished across server-side requests and the provider challenges must be separately tested.

## Two-independent-officer lost-factor recovery requirements

Existing `privileged-recovery-review.ts` is a **non-executable** precondition evaluator, not an administrative recovery service. Do not implement Auth factor reset, verified-factor removal, officer grants, or session override without **R00-D04** approval and all of:
- two *distinct* designated recovery officers whose server-authoritative accounts are ACTIVE and whose own MFA sessions are independently verified; the initiator/affected account cannot approve;
- independent identity re-verification evidence, support case, reason, timestamps and expiry, anti-replay request version and recorded approval/rejection;
- durable append-only audit, lock/proof checks at execution, challenge freshness, provider action proof, other-session revocation and incident notification;
- verified safe cancellation/recovery of lost TOTP, cross-role denial tests, provider timeout/partial failure handling and segregated emergency workflow;
- R00-D01 topology identity consistency and R00-D09 finance maker/checker unaffected.

The source read boundary, static negative tests and manual provider-only probe do **not** satisfy recovery or financial governance signoff. The 96-route inventory remains `allEntryPointsAccepted=false` and individual routes not marked accepted.

## Release blockers

| Gate | Status |
| --- | --- |
| Source tests, Prisma, TypeScript, build, public browser checks | GitHub CI required |
| Manual isolated staged AAL1/AAL2 provider observation | NOT EXECUTED |
| Actual authenticated support-case read/mutation cross-role E2E | NOT EXECUTED |
| Recovery revocation and two-officer procedure | NOT APPROVED / NOT EXECUTED |
| R00-D01, R00-D04, R00-D09 | PENDING |
| Live mandatory MFA / verified factor removal | DISABLED |
| Deployment to production | Must verify independently; Vercel has returned build-rate-limit failures |

**Next R01.3D.3F:** request owner governance decisions, run isolated provider and authenticated support acceptance using approved staging identities, and review the durable two-officer recovery process with audit and session revocation. Do not silently enable policies or execute live account mutations.
