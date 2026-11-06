# SmartHub AgroChain — Phase 06 Brand Quality & Contrast Audit

Status: design system audit remediation in source, subject to passing CI and merge.

## Scope and invariants

SmartHub's exclusive brand typeface remains **Satoshi** (300/400/500/700/900) loaded once from Fontshare in the Next.js root layout. Canonical brand colors remain:

| Role | Hex |
|---|---|
| Forest Green / primary dark | `#174C35` |
| Harvest Gold | `#D5A649` |
| Soft Sage | `#E7EFE6` |
| Warm Ivory | `#F8F7F1` |
| Agricultural Green / accent | `#398453` |

White is a neutral content surface, and warning/error colors remain semantic exceptions.

## Key fixes

1. **Muted copy:** Former `color-mix(in srgb, Forest, white 30%)` did not meet 4.5:1 contrast on Ivory/Sage. The root `--brand-forest-muted` is now a darker 18% white mix.
2. **Accent copy:** Raw Agricultural Green on Ivory/Sage can be below 4.5:1. `--brand-agricultural-ink` derives a 35% Forest Green blend for small text while preserving raw Agricultural Green for visual accents. The five-role dashboard uses this ink variant.
3. **Gold on Forest:** Raw Gold/Forest only approaches (but falls below) 4.5:1 for small text. `--brand-gold-on-dark` lightens Gold 10% for text, while focus rings retain Gold for 3:1 nontext contrast. Gold buttons use a 15%-darkened Forest text variant.
4. **Light focus rings:** Gold against Warm Ivory/white is insufficient for a distinguishable 3:1 indicator, so `--focus-accent` uses Forest Green on light pages. `--focus-on-dark` stays Gold on Forest backgrounds.
5. **Old editorial lime greens:** The editorial hero, CTA and section accents now derive from official Gold, Sage, Ivory, Forest and Agricultural Green tokens. Satoshi Bold (700) is used for editorial section headings and Black (900) for hero headings.
6. **Stray inline muted text:** The not-found, account status, password recovery confirmation, and section-card pages now reference `--text-muted`.

## Automated evidence

- `tests/brand-phase06-quality.test.mjs`: computes WCAG 2.2 relative-luminance contrast for the canonical/derived text-on-surface pairings and verifies distinct dark/light focus semantics, legacy-lime cleanup, typography, semantic statuses, and responsive styles.
- `e2e/public.acceptance.spec.mjs`: checks the browser-computed Satoshi family, hero weight and all five root brand values at desktop (1440px) and mobile (390px), and repeats Satoshi checks for the non-authenticated login design page. Screenshots upload in GitHub Actions for review.
- Existing CI still runs all node tests, Prisma/TypeScript, Next.js build and public-page browser acceptance.

**Caveats:** Source-level and public-page browser checks are not a complete WCAG audit of every possible dynamic state. The authenticated Farmer, Buyer, Field Agent, Operations and Super Admin pages cannot receive full live-account/browser validation until production environment configuration, role accounts, and release-safe data are available. Fontshare is an external font host: computed CSS `font-family` proves the intended declaration, not guaranteed successful font file loading on every network; browser font-load verification should be conducted on the deployed site as part of release acceptance. Remaining legacy hardcoded neutral/status/photography background values must be evaluated in context rather than automatically transformed into brand tokens.

## Release boundaries

No Supabase project connections, database tables, transactions, payment flags, data handling, role permissions, or authentication logic were modified for this phase.
