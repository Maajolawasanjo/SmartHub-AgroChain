# Phase 0D foundation boundary

This repository is the new SmartHub AgroChain V2 implementation. It is **not** a migration of the old public site's database or code. No production database has been connected.

## Technology

- Next.js 16.4.3 App Router, React 19.3.1, TypeScript 7.0.2
- Tailwind CSS 4.3.3; shadcn/ui components will be installed when the form and portal design contracts are ready
- Prisma 7.10.1 and Supabase PostgreSQL / Supabase Auth / Storage, not connected yet
- Payment and SMS integrations await approved business rules, accounts and credentials

## Public foundation

Routes: /, /product, /products, /how-it-works, /for-buyers, /for-farmers, /about, /contact, /login, /signup. The last two are explicit disabled placeholder pages and **do not** accept credentials. Public copy describes in-development capabilities and contains no invented live stock, prices or customer testimonials.

## Backend service plan

- identity: Supabase Auth; buyer email verification; farmer email + one-time phone verification
- authorization: server-validated roles/record ownership, independent of UI state
- supplier: farmers, farms, crops, supply declarations, verification and audit events
- procurement: buyer request lifecycle, review, matching and quotation versions
- trading: resale vs managed procurement model on commercial records
- finance: quote obligations, payment attempts, verified amounts, reversals, supplier settlement
- fulfilment: allocation, collection, delivery, disputes and signed completion

## Critical constraints

Never report a 'Paid' status from a browser redirect. Never oversell supply. Never expose a farmer's private contact/address to buyers. Never count a pending settlement as settled. Keep each domain status machine separate. All future data must be scoped server-side.

## Remaining approvals

Seller of record; ownership transfer and stock movement; allocation/reservation milestone and expiry; 75% balance due milestone; supplier payout approval and evidence; refund/cancellation rules; financial authority and reconciliation. See the private decision register (not published in this public repository).

## Local setup

Run `npm install` to generate the dependency lockfile, then commit the lockfile after successful installation. Run `npm run typecheck`, `npm test`, and `npm run build`; these checks have not yet been run with installed dependencies in this environment. Do not run database migrations until the environment and data model are approved.
