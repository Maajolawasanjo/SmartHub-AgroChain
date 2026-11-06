# SmartHub AgroChain — Phase 05: All five dashboards

**Scope:** consistent brand styling for the Buyer, Farmer, Field Agent, Operations and Super Admin portal UI. This phase changes no Supabase, Prisma, account authorization, business workflow or payment code.

## Source of truth

1. `src/styles/brand-tokens.css` — canonical Satoshi font and five-color palette.
2. `src/styles/dashboard-tokens.css` — semantic dashboard roles **derived from those root tokens**, not an independent palette.
3. `src/app/globals.css` — existing portal class families migrated to the dashboard tokens:
   - `.workspace-*` — five-role shared chrome: sidebar, active navigation, top bar, KPI/cards, status, empty states, data table, skeleton, footer and mobile menu.
   - `.agro-*` — Farmer/Operations older panels and forms.
   - `.staff-*` — Admin/Operations staff governance.
   - `.field-agent-*` — Field Agent assignments, evidence summaries and review controls.

The client component `src/components/dashboard/dashboard-chrome.tsx` already renders the same shared shell for all five roles; `src/components/dashboard/navigation.ts` retains role-specific navigation. These files were deliberately **not edited**.

## Visual rules

| Element | Unified rule |
|---|---|
| Sidebar | Forest Green, Soft Sage navigation, Gold identity accent |
| Active navigation | Soft Sage fill + Forest Green label |
| Main canvas | Warm Ivory |
| Card / top bar | Readable neutral white with Sage-derived borders |
| Page heading | Satoshi Black (900), Forest Green |
| Section / card heading | Satoshi Bold (700) |
| Navigation / labels | Satoshi Medium (500) |
| Data / tables | Satoshi Regular/Medium with tabular numerals |
| Selected progress / links | Agricultural Green |
| Focus indicator | Gold ring on keyboard focus |
| Responsive behavior | Preserve existing 1100/850/840px and smaller layout breakpoints |
| Warnings and errors | Keep semantic yellow/red alerts; never repaint them as green |

For new dashboard components, consume `--dashboard-*` variables or the existing shared `sh-*` controls instead of adding hex literals. Root colors change once and propagate across roles.

## How to verify

- `node --test tests/brand-five-dashboards.test.mjs` checks all five roles, source inheritance, shared structures, keyboard focus, responsive styles, and semantic warnings.
- Standard GitHub CI checks source contracts, TypeScript, Next.js production build and desktop/mobile public browser acceptance.
- Authenticated visual checks still require working runtime Supabase/Vercel configuration and role-specific test accounts. A successful public-site browser check must **not** be reported as proof that all protected dashboards were visually exercised.

Next: Phase 06 should audit the remaining hardcoded decorative values, check WCAG contrast and screenshots at desktop/tablet/mobile for public/auth/private views, and only then consider the design system fully finished.
