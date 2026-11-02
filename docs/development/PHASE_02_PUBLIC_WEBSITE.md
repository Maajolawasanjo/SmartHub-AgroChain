# Phase 02 — Public Website, Product Discovery & Contact

Source: approved **SmartHub AgroChain Public Website Content V3.0**, **SmartHub AgroChain Product Page**, and **SmartHub AgroChain — How It Works**. This is implementation work on a draft PR, not legal or production approval.

## Pages delivered

- "/" Home; "/product" Platform; "/how-it-works"; "/for-buyers"; "/for-farmers"; "/about".
- "/products": approved published commodity records from Prisma, server-scoped search/category filters and no live-stock claims. When database is absent, a truthful unavailable state and category guide appear.
- "/products/[slug]": approved product reference detail, published types, no public supplier contact, stock, grade, price or checkout. Leads to a sourcing enquiry—not an order.
- "/insights" and "/insights/[slug]": only approved, published articles. No fabricated editorial entries, authors or dates.
- "/faq", "/contact", "/cookies", "/accessibility" plus existing Terms/Privacy placeholders. Official approved legal text is a release gate.
- Responsive site header/footer, mobile navigation, clear CTAs, metadata and robots/sitemap.

## Data contracts

Extends existing Commodity (does not duplicate farm/supply truth) with slug/description/category/publicPublished. Adds Category, Type, InsightArticle, PublicEnquiry and PublicContactThrottle. All publication defaults **false**. No source privacy-sensitive columns are selected for public queries. New tables have RLS enabled and direct anon/authenticated table access revoked. No migration has been applied.

## Publication workflow

Operations can create categories and edit commodity metadata, product types, specification definitions and draft articles; only a server-verified Super Admin can publish/unpublish commodities, types or insights. Review via `/operations/catalog/manage`. Publication is reference metadata, **not** supply approval, stock allocation, current availability or verified supplier certification.

## Operations enquiry inbox

An authorized Operations user can review contact-form messages at `/operations/enquiries`, read private enquiry detail, reply using their email app, and change internal review status with an atomic, audited, concurrency-guarded update. The system does not pretend to send messages or create sourcing requests.

## Contact request

- Public form collects approved V3 contact fields and requires a real Prisma database plus `PUBLIC_CONTACT_ENABLED=true`, approved privacy notice, Cloudflare Turnstile site/secret keys, and a server HMAC secret (>=32 chars).
- Server validates origin, field limits, honeypot, the external challenge result, and per-email throttling; persists an enquiry transaction before success. No pretend receipt. Email `mailto:` remains usable while the service is unavailable.
- Contact submissions are not buyer procurement orders; P09 will implement requests, actor authorization, Operations review and match workflows.
- Production abuse tests, privacy retention, transactional notification delivery, contact admin inbox and configuration verification are outstanding.

## Release acceptance

- [x] Public pages and navigation implemented with approved wording, no fabricated data.
- [x] Prisma model and migration authored, NOT deployed.
- [x] Customer enquiry and catalog management backend handlers authored.
- [ ] GitHub CI: npm ci, Prisma generate/validate, typecheck, all tests, Next build.
- [ ] Human desktop/mobile accessibility and browser E2E checks.
- [ ] Real staging Supabase Auth/Postgres, RLS probes, Turnstile validation and contact end-to-end tests.
- [ ] Client policy/privacy/terms and publication approval before registration/enquiry enablement.

Keep PR as draft and never deploy over the legacy production website prematurely.
