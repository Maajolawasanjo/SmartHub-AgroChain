# Authentication frontend review boundary

This feature branch implements the documented authentication and account-lifecycle UI states. It is **not** production authentication.

- 144 registered UI states and transition contracts across 48 canonical routes.
- Browser validation and navigation; no production identity provider, database or SMS connection.
- Dev-only state review at /auth-preview.
- Account creation, email/SMS confirmation, password reset, staff invitation, contact changes and deletion require backend verification and are NOT claimed to have occurred.
- No secret keys, mock business records, or real accounts committed.
- Terms/Privacy must be approved before opening registration.
- Always test authorized actions against the user's actual server-side role.

See the complete flow documentation and tests in this branch.
