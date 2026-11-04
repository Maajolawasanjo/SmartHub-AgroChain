# Phase 08 — Buyer Onboarding, Business Profile and Procurement Workspace

## Scope and authoritative sources

The V2 Master Implementation Roadmap (P08) and the Buyer Portal Developer Specification define this phase. SmartHub is a **managed procurement platform**, not a multi-vendor checkout. The next phases are P09 Buyer Requests and Operations Demand Queue, P10 Supply Matching and Official Quotations, and later orders/payments. This phase must not invent operational or financial records.

## Delivered

- Protected `/dashboard` with the authenticated buyer name, calculated profile completion, saved specification/destination counts, truthful unavailable indicators for the four procurement KPIs, and contextual next steps. No invented zeros, due balances, quotations, or activity.
- Business Profile & Settings at `/dashboard/settings`: first-owner organization creation, partial-save business identity, required-field progress, distinct independent verification status, verified-email/account link, optional registration number, preferred contact method, saved delivery destinations and saved commodity specifications.
- Buyer organization and membership schema. The first authenticated buyer creates an organization and becomes its OWNER. Every account belongs to **at most one organization** in this release; EDITOR/VIEWER membership semantics are supported for future staff-invite workflows, but there is **no unapproved invitation or self-join endpoint**. Only OWNER/EDITOR can mutate business records; every query is server-scoped to the authenticated account's membership.
- Published commodity discovery at `/dashboard/products` and product detail at `/dashboard/products/[slug]`, using the existing public catalog read model. Buyers can save a requirement template with commodity, published type/specification, quantity/unit and preferred delivery state. These are **not** sourcing requests or stock reservations.
- API endpoints for creating/updating the buyer profile, adding/removing delivery destinations, and adding/removing saved specifications. Strict validation, same-origin checks, active buyer account and verified-email checks, transactional membership/organization locking, guarded updates, caps on saved records and audit events.
- Buyer navigation and honest placeholder destinations for Requests & Quotes, Orders & Fulfilment, Payments & Transactions and Notifications. No wallet, escrow or unsupported order/payment claims.
- Migration `20261104020000_buyer_workspace` adds business, membership, destination, saved specification and verification-event tables with foreign keys, indexes, RLS enabled and Data API grants revoked.

## Profile readiness and verification

Required business profile fields: business name, business type, primary contact name, business email, business phone, state/FCT and city/LGA. Additional registration information is optional until an approved risk-based verification policy is specified. Completion means **required information supplied**, not independently verified. Verification status defaults to `NOT_REQUESTED`; no buyer can self-verify. Profile edits are locked when independent verification is pending or approved. Contact emails are business information only; changing them does not change the verified Supabase login email.

## Security and policy boundaries

- All API reads and writes derive the buyer account from verified Supabase Auth; no client-supplied `organizationId` is trusted.
- Initial organization creation locks the authenticated account row to serialize competing first-save requests. Membership has a unique `accountId` constraint.
- Subsequent profile edits require the previous `updatedAt` version, reject stale changes and do not change verification status.
- Destination and saved specification writes re-check membership inside the organization lock and enforce a maximum of 20 destinations / 50 saved specifications per organization.
- Catalog-backed templates require active, publicly published commodities and published matching type/specification IDs. They do not expose farmer identities, exact farm addresses, unverified stock, pricing or certification.
- Buyer business data is not exposed to the Supabase public Data API. No custom RLS bypass or public policies are added.
- A saved specification does not create demand, notify Operations, promise delivery, allocate stock or generate payment obligations.

## Outstanding scope / staging gates

1. Phase 09 implements BuyerRequest/RequestLine, draft/submission, clarification, Operations queue and real request dashboard counts; Phase 10 adds quotations. The four financial/transaction dashboard KPIs are intentionally unavailable until their canonical models exist. They are **not** zero.
2. Phase 08 does not implement business verification review decisions, document upload, member invitations, multi-organization switching, notification delivery, or profile-change requests for independently verified organizations. Those require approved workflows and access policy.
3. Apply all previous migrations plus `20261104020000_buyer_workspace` to a dedicated staging Supabase project. Do not apply directly to production without review and backup.
4. With real buyer accounts A and B, verify that one cannot read/edit/delete the other's organization, specifications, or destinations; verify a suspended buyer cannot mutate data and an unverified-email buyer cannot use the API.
5. Test two concurrent initial profile saves, two concurrent destination/specification additions at the caps, stale profile edits, revoked membership, invalid commodity type/specification and non-published commodities.
6. Run Prisma validation, typecheck, all tests, production build, browser/mobile accessibility checks and a staging authorization/security review before declaring this phase staging-verified.

## Product decision pending

The Buyer Portal specification asks the client to confirm exact required business fields, buyer verification policy, notifications placement and how a buyer may represent multiple organizations. This release uses the seven practical contact/profile fields above and one organization per buyer, without implying formal verification or enabling demand submission.
