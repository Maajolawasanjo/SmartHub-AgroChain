# Phase 03 — Authentication and account-lifecycle hardening

**Engineering status:** candidate for offline code-complete following successful GitHub CI. **Not operationally verified** because no approved SmartHub Supabase project exists.

## Changes and reasons
1. **Public account integrity:** Signed-up identities with missing profiles can be reconciled after verified email via an unexpired one-time server-created SignupIntent. Supabase user-editable metadata holds only an opaque lookup; the actual role, phone and profile are read from the trusted DB. Provisioning and audit occur in one transaction.
2. **Password reauthentication:** Sensitive changes use a detached Supabase Auth client so the user's active session is not replaced by the password-validation operation.
3. **OTP correctness:** Provider's `new_phone` determines whether to request or resend. Verified result must belong to the correct account and target phone; failed attempts are throttled and locked.
4. **Invitation recovery:** A server-authorized invitation exists before sending email; invitations can be safely resolved if a delivered email fails to persist its Auth user ID. Privileged self-registration remains prohibited.
5. **Sessions and deletion:** Other refresh sessions can be revoked with password confirmation. Users may cancel *requested*, not in-review, deletion requests; actual deletion is deferred to approved governance.
6. **Callback:** Explicit type validation and trusted configured redirect origin, including provider recovery semantics and idempotent provisioning.

## Acceptance checks
- [x] No intentional fabricated identity, phone verification or invitation success in absence of providers.
- [x] New migration and RLS/revocation written, **not applied**.
- [x] Server-side public role restrictions, owner checks, recovery and attempt-limit code authored.
- [x] Structural regression tests authored.
- [ ] CI Prisma schema generate/validate, TS typecheck, all tests and Next.js build on this exact commit.
- [ ] Real staging Supabase verification of email, phone, password reset and invitations; migration rollback test.
- [ ] Provider callback/OTP replays and parallel-signup race tests.
- [ ] Operational policy approval for staff MFA, retention, deletion, email/phone provider settings.

## Residual risks and later phases
The 144-state registry represents UI and transition contracts, not proof of 144 live backend operations. Staff directory, assignment, revocation and elevated governance are Phase 04. Financial deletion/retention policies are not authorized. Pending SMS changes may require provider cleanup; real-world test and enforce non-ambiguous phone ownership before launch. Hosting, SMTP/SMS, secrets, Prisma migrations, security review and E2E remain mandatory.
