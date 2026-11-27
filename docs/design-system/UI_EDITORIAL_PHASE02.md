# UI redesign — Phase 02 shared public components

Status: implemented at source level; CI and visual acceptance pending.
Builds on Phase 01. Public navigation is compact, with a solid ivory canvas, thin border, measured type and a single primary action. Existing destinations are retained; mobile navigation includes the sourcing CTA. Footer uses the existing deep forest derivative and semantic group headings. Public-only buttons and editorial secondary links are restrained; contact and catalogue inputs use underline styling, visible focus and minimum touch targets. No contact handler, form field, feature flag, API, data, authentication or portal code changed.

Legacy public navigation overrides were narrowly consolidated to prevent specificity conflicts. Full global stylesheet extraction remains later work. At desktop and mobile widths verify the sticky header, menu, all links, disabled contact form, keyboard focus, footer wrapping, and absence of horizontal overflow. Do not treat source tests as visual acceptance.
