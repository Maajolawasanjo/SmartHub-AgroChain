# UI redesign — Phase 01 public editorial foundation

Status: source implementation, pending CI and visual acceptance.

Reference: the owner-provided Nova Grove screenshots and comparative source review. Preserve SmartHub's approved five brand colors and Satoshi. Public editorial typography uses regular-weight display text and upright lightweight accents; 1240px maximum content width, fluid gutters, spacious sections, restrained controls and squared photography. No new brand colors or dependencies.

Scope: PublicShell owns a dedicated public-editorial stylesheet. Existing root, dashboard, authentication and business tokens remain intact. Existing legacy CSS is retained temporarily as a fallback; scoped rules have higher specificity and will be consolidated during subsequent page/component phases. Existing navigation, copy, image attribution, focus states and functional controls remain in place.

Acceptance: run source tests and production build; inspect desktop and mobile public pages at 375, 768, 1024 and 1440px; verify no overflow, legible typography, keyboard focus, image captions, menus and all existing CTAs. Verify authentication and five portal layouts remain unaffected. Do not claim visual acceptance until rendered evidence is available. Do not merge or deploy to the independent Agronexus project.

Next: Phase 02 header/footer and shared public controls; Phase 03 cinematic homepage composition. No financial, provider, database or role changes.
