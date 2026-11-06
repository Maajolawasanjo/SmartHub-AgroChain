# SmartHub AgroChain

SmartHub AgroChain is a Nigeria-focused agricultural technology initiative designed to improve agricultural sourcing, supply information, and coordination between producers, buyers, and SmartHub operations.

**Status (6 November 2026):** Substantial full-stack application code, database migrations and automated source tests are present. This is **not** a production-readiness claim; connected multi-role and provider acceptance remains required. Requirements decisions are tracked under the [R00 governance protocol](docs/implementation/R00_REQUIREMENTS_GOVERNANCE.md).

## Technology direction

- Next.js App Router, TypeScript, React
- Tailwind CSS and shadcn/ui
- Prisma ORM and Supabase PostgreSQL
- Supabase Auth and Storage
- Provider integrations only after the relevant workflows and policies are approved

## Product direction

The planned experience focuses on managed agricultural procurement and operations-controlled sourcing rather than unrestricted farmer-to-buyer checkout. Detailed trade, inventory, payment and settlement rules are under client review.

## Engineering principle

Build complete authorized workflows, not disconnected screens. Each feature needs validated records, server-side permissions, state transitions, next-action guidance, error recovery and tests.

## Security and confidential documents

Never commit secrets, database URLs, verification evidence, personal data or confidential client requirements to this public repository. Publish only client-approved materials.
