# Phase 18 — Public Website, Brand Storytelling and Content Completion

**Status:** implementation in draft GitHub PR, stacked on Phase 17. Not launched, not a legal or customer acceptance certificate.

## Why Phase 18 exists
Phase 02 supplied genuine marketing routes, SEO, catalogue queries and safe public forms, but most primary public pages reused a minimal marketing template, and the home page had no editorial agricultural photography. The public experience did not yet express the managed procurement model with enough visual depth or useful detail for real buyers, producers and partners.

## Design and copy changes
- Homepage: large photographic hero, strong editorial serif headline, dual buyer/farmer pathways, managed sourcing explanation, split mission narrative, three audience cards, six-step workflow, operating model, three controls, published commodity discovery, a FAQ preview and a clear contact CTA. No fabricated live orders, financial figures, customer stories or inventory prices.
- Buyers: procurement-first hero, explicit requirements, buyer types, five sourcing milestones, quotation and provider payment boundaries, delivery receipt accountability, FAQ and sourcing enquiry.
- Farmers: farm and harvest record explanation, verified/expected physical supply distinction, farm review, price offer and independent supplier settlement boundaries, document preparation, FAQ and participation enquiry.
- Platform: explains five differently authorized portal roles, actual data-state handoffs and production-readiness limitations. Illustrative workflow is identified, not represented as live operational data.
- How It Works: detailed six-stage managed sourcing process, participants' responsibility split, disputed delivery and provider reconciliation explanation, and paths for buyers/farmers/partners.
- About: distinct company narrative, mission, direction, operating values and stage-of-development transparency. No invented team size, investors or contracts.
- New Partnerships and Help routes: authentic collaboration areas and accountable public/private enquiry paths, replacing previously missing landing destinations.
- Contact: accessible enquiry topics, visual editorial hero, official email alternative and the *existing* real protected ContactForm only when database, anti-bot and legal launch gates enable it. No fake successful form submissions.
- FAQ: expanded answers about managed intermediary procurement, no guaranteed supplier match, approved buying terms, farmer obligations and separate provider-verified transfer.
- Catalogue and Insights: upgraded editorial headers; only approved real DB-published products/articles shown. Empty states remain honest when no data is connected.
- Global header/footer: calmer hierarchy, correct buyer/farmer focus, compact mobile navigation, links to all actual public pages, full sitemap and policy placeholders clearly marked pending final legal approval.
- Responsive styles for image-led hero, split narratives, audience cards, workflow grids, dark and light sections, mobile tables/entrypoints, visible keyboard focus, and reduced-motion support.

## Imagery and licensing
- Illustrative agricultural photographs are loaded from `images.unsplash.com` using fixed image identifiers and constrained widths. They are not labelled as SmartHub farmers, customers, employees or real transactions. Figure captions and a sitewide note reinforce that distinction.
- Unsplash's current public license permits most commercial website uses: https://unsplash.com/license. Verify individual images, third-party rights, content relevance, availability and project-specific brand appropriateness before launch. Images featuring identifiable people, trademarks, protected artworks or branded endorsements may require additional releases. Obtain formal rights review and ideally replace generic illustrations with genuine, consented SmartHub photography when available.
- External CDN image delivery is a launch dependency; staging must verify load status, cropping, LCP, dimensions, alt text and mobile performance. CSS provides backgrounds but does not guarantee external CDN availability. No image backend/provider test was run as part of source CI.

## Functional gates and business truth
- **Managed intermediary only:** no direct buyer-to-farmer contact marketplace. SmartHub coordinates procurement and may approve specific farmer purchase terms. A public enquiry is not a quotation, inventory reservation, verified buyer payment, accepted delivery, or farmer settlement.
- **No invented data:** published catalogue and insights continue to query authorized data; no synthetic product prices, quotes, supply availability, customer testimonials or figures appear.
- **Launch-dependent actions:** public signup remains gated by approved legal policies and provider setup. ContactForm stays disabled unless protected database and anti-bot services are actually configured. Mailto provides an independent enquiry fallback.
- **Legal:** Terms of Service, Privacy Notice and Cookie Policy remain pending formally approved text; do not activate public signup or assert legal acceptance until reviewed.
- **SEO and accessibility:** all major marketing routes have distinct metadata, sitemap navigation is updated, mobile navigation is explicit, skip link remains in `PublicShell`, and layout supports reduced-motion. Stage browser and automated WCAG testing still needed.

## Release acceptance for Phase 18
1. Run normal GitHub CI on the exact PR head: Prisma generation/validation, TypeScript, syntax checks, source tests and Next.js build.
2. Visual review at desktop 1440/1280, tablet 768, and phone 390/360 on homepage, buyer, farmer, platform, about, process, partnerships, help, FAQ, Contact, catalogue, Insights, privacy/terms.
3. Browser test all mobile navigation links, Back/Forward focus behavior, FAQ details disclosure, anchor links, main CTA links, email and password/OTP-free enquiry alternatives.
4. Run keyboard-only and assistive-technology smoke tests; measure color contrast, headings, reduced-motion and screen-reader accessibility; fix any visual regressions.
5. Obtain client-approved brand identity, logo and imagery/consent clearance. Current text-based brand mark is a deliberate fallback because no approved source image logo was available in the audited repository.
6. Confirm all site copy, legal policies, domain/email ownership, service coverage, company legal name, operating status and business claims with the owner before production publication.
7. Activate and test the protected contact form with real staging CAPTCHA, database and audit/retention settings; verify failures and false positives, and keep public signups disabled until approved.
8. Verify images.unsplash.com deliver real images at all required sizes, optimize if needed; consider self-hosted approved assets and CDN policy; check external image content relevance to Nigerian agriculture.
9. Test live, approved commodity categories/variations, empty catalogue, no match search, contact prefill and authorized Insights publishing with real staging content only.

## Out of scope / no claims
This phase does not invent legal pages, product inventory or blog content, provision Supabase, complete provider integration, merge earlier draft phases or certify production readiness. The existing production integration acceptance in Phase 17 remains a prerequisite.

## Milestone
Code implementation on Phase 18 PR is distinct from client acceptance. Source CI success means the code compiles and static tests pass, not that every image, screen or external service has been visually confirmed on real staging.