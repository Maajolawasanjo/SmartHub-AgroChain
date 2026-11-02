# Authentication screen implementation — frontend stage

**Scope:** The 144 state registry and 144 action transitions have been mapped to 48 canonical route paths, and every path has an App Router page. This is an interactive **frontend review implementation**, not a functioning identity service.

- Public self-signup: Buyer and Farmer only. Buyer requires email verification; Farmer requires email plus one-time phone verification before full dashboard access. Do not trust role selection for actual authorization.
- Forms validate client-side inputs; all verification, signup, session management, password changes, invitations, contact changes, preferences, support requests, staff status changes and deletions **must** be revalidated and executed by the backend. Forms currently respond truthfully that no operation occurred.
- The 144-state visual explorer is in `/auth-preview` and `?preview=STATE-ID`, available in development only. It cannot grant access, create accounts, prove verification, or confirm account deletion.
- All staff and private account routes are locked down in production until real identity/authorization is implemented. Development-only demonstrations contain no private data.
- The Terms and Privacy routes are **unapproved legal-content placeholders**. Actual signup must not launch without approved policy text.
- Account deletion is a **proposed** process: actual reauthentication, legal retention, refunds, active obligations, staff authority and cancellation rules need client approval.
- Staff invite/account-lifecycle sections are proposals; none is a confirmed backend authority policy.
- The app still needs a verified SmartHub Supabase environment, schema design, secure server services, trusted callbacks, live email/SMS delivery, and end-to-end tests before production enablement.
- Avoid touching the old live website or unrelated Supabase projects.

## Verification

Run `npm test` (registry structure and safety checks). After registry access to the correct dependency versions is available, run `npm ci` after generating a committed lockfile, `npm run typecheck`, and `npm run build`. Browser E2E cannot be certified until Next.js dependencies are installed and the app can be served.

## Next implementation stage

Finalize approved business identity and consent policies, secure database project and environment settings; then implement actual Supabase email/password authentication, server-held authorization, phone OTP, staff invitations and audit-safe account lifecycle. Redirect the authenticated user using trusted claims/permissions; never accept a browser-provided role or redirect as an authorization decision.
