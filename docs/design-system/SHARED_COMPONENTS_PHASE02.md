# SmartHub AgroChain — Phase 02 shared interface components

Phase 01's five-color, Satoshi-only root styling is authoritative. Phase 02 creates a reusable UI foundation consumed by the public site and existing operational surfaces, without changing backend contracts.

## Components

`src/components/ui/brand.tsx` exposes:

- `BrandLink`: semantic Next.js link with `variant="primary" | "secondary" | "quiet"`, optional `fullWidth`; preserves route navigation.
- `BrandButton`: native button with safe default `type="button"`, explicit `type="submit"` for forms, loading/disabled support via native HTML props.
- `BrandCard`: semantic `article` with white/sage tone, shadow, inherited heading/paragraph structure.
- `BrandBadge`: neutral/sage, harvest-gold, or outline presentation for genuine states.
- `BrandField`: explicit label `htmlFor` linkage and optional hint, keeping native input/select/textarea semantics.

`src/styles/brand-components.css` defines `.sh-button`, `.sh-card`, `.sh-field`, `.sh-input`, `.sh-select`, `.sh-textarea`, `.sh-badge`, and `.sh-table` tokens, imported immediately after `brand-tokens.css` by `src/app/globals.css`.

## Migrated surfaces

- Main site header's sourcing CTA; general marketing editorial hero/section CTA links; reusable marketing `SectionPage` cards.
- Contact enquiry form fields and submit action. Its endpoint, validation, Turnstile, honeypot, disabled state and genuine submission responses are unchanged.
- Existing auth card/field styling and Farmer/Operations portal panel/status styling migrated to global semantic surface/border/radius tokens.
- Public product card and contact form surface styling migrated to global tokens.

## Accessibility

Native buttons and links retain their functionality; controls are at least 44px tall, with explicit focus-visible rings, native disabled behavior, label-input associations, a reduced-motion override and tabular figures in shared tables. Brand gold is not a default small-text color on ivory. Semantic danger/error states remain deliberately distinct.

## What is not yet complete

Other role-specific dashboards and specialized editorial components still contain many hard-coded colors. Phase 03+ will migrate those progressively. A public CI screenshot is not equivalent to testing authenticated UX with live Supabase records.

## Required validation

`npm test`, Prisma generation, TypeScript, Next.js build, real browser desktop/mobile acceptance. No changes to database migrations, Stripe/Paystack, role permissions, records or API request payloads.
