# SmartHub AgroChain — Brand foundation (Phase 01)

This is the approved visual identity for every application surface: public website, registration and recovery, Farmer, Buyer, Field Agent, Operations, and Super Admin.

## Official brand colors

| Role | Token | Value | Use |
|---|---|---|---|
| Primary dark | `--brand-forest` | `#174C35` | Headings, navigation, primary actions, dark panels |
| Premium | `--brand-gold` | `#D5A649` | Select highlights and focus cues |
| Soft neutral | `--brand-sage` | `#E7EFE6` | Secondary panels and understated supporting surfaces |
| Page canvas | `--brand-ivory` | `#F8F7F1` | Main page backgrounds |
| Action accent | `--brand-agricultural` | `#398453` | Selected accent indicators and highlights |

Pure white remains an accessibility-neutral card/text color; functional error/warning states still use appropriate semantic colors. Deep charcoal is **not** a SmartHub brand color.

## Single source of truth

- `src/styles/brand-tokens.css` defines canonical values, compatible Tailwind v4 `@theme inline` utilities, supporting neutrals derived from approved brand colors, spacing and typography tokens.
- `src/app/globals.css` imports the tokens and applies them through global elements plus existing public, auth and portal classes. Do not add new hex literals for brand colors into individual pages.
- `src/app/layout.tsx` loads Satoshi from its official Fontshare hosted stylesheet **once** for all Next.js routes.
- Tailwind utilities can use `bg-forest`, `text-forest`, `bg-warm-ivory`, `bg-soft-sage`, `text-agricultural`, and `text-harvest-gold`. Existing `bg-brand`, `text-ink`, etc. remain mapped to the approved tokens.
- For component CSS, use `var(--brand-forest)`, `var(--text-primary)`, `var(--surface-page)`, `var(--surface-card)`, `var(--border-subtle)`, etc.

## Satoshi — only branded typeface

Satoshi by Indian Type Foundry / Fontshare. This integration uses the hosted Fontshare CSS API and does not commit or redistribute licensed font binaries. If that stylesheet is unavailable, the browser uses an explicitly declared readable system fallback until it recovers. Source: https://www.fontshare.com/fonts/satoshi.

| Content | Font weight | Design rule |
|---|---|---|
| Hero | 900 Black | `--type-display` / tightly spaced |
| Section headings | 700 Bold | `--type-section` |
| Page titles | 700 Bold | `--type-page` |
| Buttons, navigation and form labels | 500 Medium or 700 Bold | Stable controls |
| Paragraphs, table cells | 400 Regular | Readability first |
| Secondary editorial labels | 300 Light where contrast is adequate | Avoid for small labels |

Use `font-variant-numeric:tabular-nums` for financial data, prices, stock and metrics.

## Accessibility and scope

- Keep focus-visible rings and the `prefers-reduced-motion` support. Gold-on-ivory is for ornament, not default small text.
- Preserve real operational labels/statuses; the design system must not change authorization, transactions, or record provenance.
- New UI must consume shared tokens instead of hard-coded colors. Existing highly specialized components still need incremental migration: global font overrides and major legacy palette constants were removed in Phase 01, but a full component-by-component contrast audit belongs to subsequent phases.
- Run `npm test`, `npm run typecheck` and `npm run build` plus mobile/desktop browser acceptance before merging.

## Next passes

Phase 02: shared buttons/forms/cards/table primitives. Phase 03: marketing. Phase 04: authentication. Phase 05: every user dashboard. Phase 06: visual regression, accessibility and brand literal audit. These changes are deliberately separate from Supabase configuration, payments and backend logic.
