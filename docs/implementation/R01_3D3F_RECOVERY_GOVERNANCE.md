# R01.3D.3F — Versioned Recovery Governance, Audit Draft and Execution Blockers

**Status:** source and offline security contracts only. This milestone has **no verified-factor removal capability, no Auth admin API, no session revocation action, no live recovery request database table and no privileged recovery endpoint**. Mandatory MFA rollout remains disabled.

## Scope confirmed

Private source: SmartHub AgroChain Admin Dashboard Web Implementation (Admin Team & Access) and Admin Dashboard Master Requirements & Implementation Traceability Register (two designated Super Admins, MFA, independent financial authority, approved recovery). Existing R01.3D.3A introduced a simple human-review precondition evaluator, R01.3D.3B-D added dormant privileged API security, and R01.3D.3E added an isolated staging AAL1/AAL2 read-only acceptance harness. The staging MFA workflow has **not been executed** because isolated test users and protected GitHub secrets have not been confirmed. No production user, JWT, factor or Supabase project was changed.

### R00 gate states

- R00-D01: Admin topology, provider identity ownership and audit/data schema — `PENDING_OWNER_DECISION`.
- R00-D04: MFA pilot, two designated independent Super Admins, recovery officers, session revocation and exceptions — `PENDING_OWNER_DECISION`.
- R00-D09: Independent financial maker/checker, no escalation by Super Admin title — `PENDING_OWNER_DECISION`.

## Code delivered

1. **`src/server/admin/privileged-recovery-ceremony.ts`** is a non-executable, deterministic preflight **simulation**. It first checks the previous human-review preconditions; it then rejects stale expected/locked request versions, reused or missing 256-bit nonce digests, reordered/duplicate/missing/tampered digest-linked events, unapproved or failed identity re-verification, self-approval, duplicate officers, inactive/wrong-role/undesignated officers, stale verified TOTP AAL2 observations, rejection, absent provider readiness and inability to append the audit ledger. Even when all simulated evidence passes, the result explicitly has `executable: false`; it does not confer permission or invoke Supabase Auth.
2. **`docs/implementation/drafts/R01_3D3F_MFA_RECOVERY_LEDGER.sql.disabled`** is a **DISABLED, NEVER APPLIED** proposed private-schema data model for recovery requests, per-version independently verified officer decisions, and digest-chained events. It contains RLS and Data API revocation design. It is **not** a Prisma migration or an executable runtime file. It has no grant to `anon` or `authenticated`. It requires expert review for schema naming, dedicated database role, transactional locks, append-only triggers, digest signing and retention, before being converted into a separately approved migration.
3. **`src/app/admin/security/mfa/recovery/page.tsx`** is a protected *read-only* Super Admin view of actual source-controlled owner gate statuses and currently computed MFA enforcement switches. It links to existing governance, MFA and support, and cannot accept codes, authorize officer actions, approve governance records, remove factors or alter session state.
4. The new screen is linked from `/admin/security/mfa` and `/admin/settings`.
5. **`tests/r01-3d3f-recovery-ceremony.test.mjs`** evaluates positive *simulated* evidence and negative stale-version, nonce replay, ledger tampering, duplicate/officer self-approval, wrong officer role, stale/unverified Auth assurance, expiry, rejection, provider/audit outages and undeployed recovery boundary cases.

### A replay-safe real workflow is not yet implemented

A real implementation must use **current server-owned records** from a dedicated privately permissioned schema. Every decision must be bound to a locked request ID, version, incident and issuer. Merely passing a JavaScript snapshot of booleans, officer designations, or stored AAL2 timestamps is **not** trusted provider verification. The example SHA-256 digest chain detects accidental changes but is **not tamper-proof**, authenticated, externally signed or immutable by itself. This phase creates **no external audit anchor** and **no pre-authorized execution route**.

The proposed future execution contract (requires separate approval before code or database changes):
- Authoritative session-verified, active independently designated officers, two distinct identities and separate requester/subject; independent identity re-verification with documented evidence.
- Serializable DB transaction locking the exact record and version and atomically consuming a one-time, server-generated nonce with append-only events and a uniqueness constraint. Reject replay, version change, stale Auth sessions, suspended officers and conflicts after retry.
- Separate approved Auth provider action that only touches the exactly identified account/factor with explicit provider proof, no browser-supplied factor ownership, no general service-role bypass, and no admin self-service reset.
- Durable failure reconciliation for partial provider action, manual independent review, append-only external audit anchor, incident notification, other-session refresh revocation and explicit JWT expiry limitations. The Supabase session policy must be confirmed with actual provider testing, since previously issued JWT access tokens may remain valid until expiry after sign-out.
- Control of privileged actions before and after recovery; explicit R00-D09 segregated finance maker/checker; designation of a surviving second Super Admin before attempting any lockout-sensitive change.
- Full staging E2E with real isolated users (AAL1/AAL2, unenrolled/enrolled, wrong OTP, expired/revoked sessions, officer suspension, dual approvals, interleaved version conflict, provider outage, retries and audit/revocation). No changes to live production factors as tests.

### Access from an AAL1 account with a lost authenticator

The recovery governance page is within `/admin`, which will require AAL2 after future enforcement. It is **not** the emergency reset page. The existing `/account/help` and `/support` recovery guidance/case creation, and the AAL1-accessible `/account/security/mfa` step-up screen, remain separate to avoid lockout loops. A staff user with a lost authenticator can still open a normal support case and reply to their own public conversation; this is not approval to remove a verified factor.

### Acceptance status

| Gate | State |
| --- | --- |
| Source Node security tests, Prisma validation, TypeScript, Next build, public browser | CI required |
| Two-officer preflight code | Implemented **simulation**, no execution |
| Private ledger draft | DISABLED, unapplied and unaudited |
| Recovery admin page | Read-only |
| Isolated staging Auth provider check | NOT RUN |
| Sign-out/revocation/failed recovery real provider tests | NOT RUN |
| Production MFA enforcement | OFF — owner decisions pending |
| Vercel deployment | Must independently verify latest SHA; previously build-rate-limited |

**Next R01.3D.3G:** owner/security review of R00-D01/D04/D09 and proposed private ledger, isolated Supabase staging acceptance with disposable identities, and audited/reviewed execution design only after authorization. If Vercel rate limits continue, resolve deployment availability separately; passing GitHub CI does not mean production is updated.
