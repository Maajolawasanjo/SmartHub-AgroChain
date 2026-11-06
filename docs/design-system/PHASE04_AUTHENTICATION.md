# SmartHub AgroChain — Phase 04 Authentication Branding

Phase 04 applies the agreed five-color SmartHub identity and exclusive Satoshi typography to account, registration, sign-in, verification, recovery, invitation, and lifecycle screens.

## Why one change covers every account route

Both `src/features/auth/components/live-auth.tsx` and `src/features/auth/components/auth-experience.tsx` use a shared `auth-*` CSS class contract in `src/app/globals.css`. The global CSS imports `src/styles/brand-tokens.css`, so the approved Forest Green, Harvest Gold, Soft Sage, Warm Ivory and Agricultural Green values are the source of truth for their surfaces and controls.

In Phase 04:
- The auth aside becomes Forest Green with a restrained Agricultural Green glow; dark copy is warm Sage; Gold highlights remain on the dark side.
- The form surface stays neutral white for readability, bordered with the semantic Sage-derived line and surrounded by Warm Ivory.
- Satoshi Black (900) drives auth hero and account headings. Labels are Satoshi Medium (500); buttons are Satoshi Bold (700). All inputs and password-toggle controls inherit Satoshi.
- Buttons, tabs, links, states and preview controls inherit color and focus tokens. Disabled controls remain visibly distinct.
- Mobile CSS keeps the single-column auth layout at 880px and trims form padding at 430px.
- Genuine warning, information, error and validation state palettes are preserved because they are semantic security feedback, not additional decorative brand colors.
- Account deletion status copy now uses `--text-muted` rather than a hardcoded legacy green.

## Out of scope and guarantees

There are **no** authentication handler, routing, authorization, session, database, email or payment behavior changes in this phase. No signup, invitation, recovery, or verification restriction has been disabled. Production account functionality still depends on verified Supabase/Vercel configuration.

## Validation

`tests/brand-authentication.test.mjs` checks consistent shell adoption, Satoshi weights, tokens, mobile layout, focus, form validation accessibility and unchanged route contract. GitHub CI additionally runs source tests, Prisma/TypeScript, Next.js build and actual desktop/mobile public-site browser acceptance.

Further phases will continue bringing all operational dashboards onto the same brand foundation.
