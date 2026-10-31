# Phase 01 — Unified dashboard system

Status: **Code implemented; pending complete GitHub CI and browser/accessibility acceptance.** No SmartHub Supabase project is configured or modified.

## Delivered

- Shared `DashboardFrame` / interactive `DashboardChrome` for all five account roles, with a professional deep-green/amber layout, mobile drawer, skip link, role-aware navigation, breadcrumbs, personalized header, profile menu, support and logout.
- Role-specific navigation metadata in `src/components/dashboard/navigation.ts`; **only implemented destinations are interactive**. Future screens are marked **Soon** and disabled; they never pretend to be complete. Existing placeholder pages remain available as explanatory deep links for earlier routes.
- Reused frame for the live-data Farmer and Operations portals, preserving their existing `requirePortal` server authorization, queries, details, forms and API calls.
- Reused frame for Buyer, Field Agent and Super Admin protected entry points; their unfinished workflow modules still explicitly state that operational data is unavailable.
- Shared card, semantic status, empty/unavailable, skeleton, horizontally accessible table and recoverable error components.
- Loading/error boundaries for every root portal. An error message is deliberately generic to avoid leaking user or database details.
- Navigation/profile links point to existing real account screens or to explicit support/outcome pages; notification bells and fake unread counts deliberately absent until the notification backend is developed.
- Navigation links do not grant authorization; actual role and verification status come from `getAccountContext`, `accountDestination` and existing endpoint authorization.

## Explicit scope boundaries

- Phase 01 does not build Buyer procurement, Field Agent inspections, Super Admin governance or notification persistence. Those remain phases 04 onward.
- No fake financial metrics, buyer requests, farmer assignments, stock, activity feeds, testimonials or notification counts were introduced.
- Missing modules are non-interactive sidebar items. Do **not** change `availability: "planned"` to `"active"` merely because a placeholder route exists. Activate only once backend and page actions are implemented.
- Dashboard role navigation remains a presentation layer only. Operations/Field Agent assignment-level access and granular staff permissions require Phase 04.
- The chosen labels `Payments & Settlements` vs `Payouts & Wallet` are UI-level recommendations; they do not create a stored-value account.

## Test/acceptance gates

- [x] Farmer + Operations existing pages re-render inside unified shell without changing their API endpoints.
- [x] All five roles appear in navigation registry; planned destinations are non-actionable.
- [x] Desktop + mobile CSS, keyboard escape, skip link, loading/error recovery and status semantic tokens authored.
- [x] Automated structural tests for role metadata, auth boundary, responsive behavior and routes.
- [ ] Install dependencies, Prisma generate, typecheck, Next.js build and existing CI passes for this branch.
- [ ] Browser tests on desktop and mobile viewport widths, keyboard tab/focus order, screen readers and touch controls.
- [ ] Real session/authorization testing against designated SmartHub Supabase staging environment.

## Operational guidance

Review `/dashboard`, `/farmer`, `/field-agent`, `/operations`, `/admin` with authorized staging test accounts once Supabase exists. Until then, route and component structural checks do not certify visually rendered authenticated screens. Do not merge stacked draft PRs or deploy the legacy domain without a reviewed integration path.
