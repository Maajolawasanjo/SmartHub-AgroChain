# SmartHub AgroChain — authentication activation checklist

This implementation is **not** a promise that entering one Supabase URL turns on all services. No real credentials are committed. The connected Supabase account currently available to ChatGPT does not identify a SmartHub-owned project; do not use other projects.

## Required environment values

- `NEXT_PUBLIC_SUPABASE_URL`: approved SmartHub Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: project publishable key (or compatible public anon key).
- `DATABASE_URL`: server-only connection string for the same project's Postgres (pooler/runtime as appropriate).
- `DIRECT_URL`: separately verified direct migration database connection string (do not run against another project).
- `APP_BASE_URL`: exact HTTPS site origin (localhost for development).
- `AUTH_RECOVERY_SECRET`: random high-entropy secret at least 32 characters.
- `PUBLIC_SIGNUP_ENABLED`: must remain `false` until actual Terms/Privacy are approved and Auth/DB/SMS checks pass.
- `SUPABASE_SECRET_KEY`: server-only project secret/service-role key for approved staff invitations. Never prefix with `NEXT_PUBLIC_`.

## Supabase Dashboard requirements

1. Enable email/password signups and **require confirmed emails**. Configure reliable SMTP before production.
2. Set Site URL to `APP_BASE_URL`, and allow `APP_BASE_URL/auth/callback` in redirect URLs (including approved development domains separately).
3. Configure confirmation email template to link to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email` (see current Supabase Auth documentation).
4. Configure recovery email template to link to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`.
5. Configure invitation template to link to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite`; approval of staff-invite policy required first.
6. Configure a Nigerian-capable SMS provider in Supabase Auth and enable phone-change confirmation, then test on actual Nigerian numbers. If project Auth does not support this exact phone-change flow, do **not** enable Farmer registration until the provider-compatible equivalent has been implemented and tested.
7. Implement and test Supabase Auth email resend, password expiry and password policy/rate limits.
8. Disable anonymous Auth sign-ins. Consider MFA requirements for privileged staff before launch.

## Database

1. Start from a **new or explicitly approved** SmartHub-owned Supabase project; audit existing models before any legacy migration.
2. Install dependencies using an approved package registry, generate + commit a lockfile, run `npm ci`.
3. Run `npm run db:generate`, `npm run typecheck` and `npm test`.
4. Review the `prisma/migrations/*` schema, verify database identity and backup, then use `npm run db:migrate`.
5. Confirm `public` application tables have RLS on, no `anon` or `authenticated` table grants, and Prisma uses a trusted server-only connection.
6. Run email signup, callback, farmer phone OTP, buyer login, password reset, and account-restriction E2E against a **nonproduction** database.
7. Launch only after privacy/terms policies, staff invitation and deletion-retention decisions are approved.

## Known important boundaries

- A Supabase URL and publishable key alone cannot execute database-backed operations; connection strings and migrations are required.
- The existing repo has not had a full Next.js/TypeScript build here because npm registry access failed; do not claim a verified production build.
- Some account-lifecycle screens still carry clearly labelled *not enabled* status; account deletion is a request for manual review, not immediate deletion.
- Staff bootstrap **must be a controlled administrator operation** after identity checks, not a public signup option or an SQL role assignment run without approval.
- This is a new implementation. Do not deploy over `smarthubagrochain.online` until staging QA passes.

## Phase 03 hardening updates (offline code; not staging-verified)

- Public signup first saves a **server-issued SignupIntent** and passes an opaque identifier in the provider signup metadata. The metadata does **not** grant roles: only an unexpired, unconsumed, confirmed-email-matched database intent can provision a Buyer/Farmer account, in one transaction with the audit event. A valid callback or a later successful login can reconcile an identity whose profile was not created. Invitations without a public intent cannot self-register into public roles. Expired/failed signup intents contain personal information and require a scheduled deletion/retention policy.
- Migration `20261102000000_auth_lifecycle/migration.sql` is after the catalog migration and must be reviewed/applied to **SmartHub** staging only. The signup intent table is RLS-enabled and revoked from direct anon/authenticated Data API access.
- Current-password confirmation uses an isolated, non-persistent client for password, email, phone, deletion-request and other-session revocation actions. No password is logged or stored.
- Farmer phone verification now distinguishes a provider-pending `new_phone` from a mere throttle entry, checks OTP result identity, limits incorrect attempts, and records changes in a Prisma transaction. Supabase provider phone-change confirmation must be enabled; test real delivery and stale `new_phone` cleanup on staging. A phone belonging to another pending user requires provider-side uniqueness remediation before production.
- Staff invitations are **recorded before** sending an external invite; if delivery succeeds but the response/DB assignment fails, confirmed recipient-email matching allows authorized acceptance of the pending record. Full revoke/resend/staff-governance UX is Phase 04, not marked complete here.
- `/account/sessions` can revoke other refresh sessions using a current-password confirmation but does not claim to enumerate devices. Supabase access JWTs may remain valid until expiry; configure appropriately short JWT lifetime and session/permission checks for sensitive operations.
- `/account/delete/cancel` allows cancellation of a REQUESTED deletion request with a recorded audit event. Actual account deletion and financial/audit record retention require approved policy and staff review.
- Email/SMS confirmations, provider callback templates, rate limits, test identities, concurrency, and RLS constraints still need staging verification. Do not enable public signup from unit/structural tests alone.
