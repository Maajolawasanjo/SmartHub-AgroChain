# R00 — Requirements decision-gate protocol

**Status:** Evidence baseline drafted; product-owner decisions **not approved**.
**Repository baseline:** `35f8c523e8f0518d2ebcbdb0d300c0cbf9bd831d`.
**Owner:** Product Owner / Founder, with engineering and Operations supplying evidence.
**Scope:** Process governance only. No application behavior, database schema, permissions or release flags are changed here.

## Private source handling

The full client source PDFs, document quotations, product-owner answers, commercial details, and the detailed 102-row requirements matrix are **not** stored in this public repository. Reviewers must use the separately provided confidential R00 decision pack. Document identifiers in `r00-gates.json` are pointers only, not authorization to implement a disputed behavior.

## Evidence and authority

1. The latest explicitly approved, scoped product-owner decision governs the affected behavior.
2. The master PRD defines overall business model and MVP scope; detailed approved module specifications define behavior within their domains.
3. Approved module continuations and cross-module addenda must be considered together with originals. A summary is **not automatically** a replacement for a detailed specification.
4. Final approved public website copy governs website text unless a later written editorial approval supersedes it.
5. Prior engineering plans, UI prototypes, existing code and historical tests describe the implementation, not authority to override a conflicting business rule.
6. When two approved sources conflict, log the exact source references and **block the affected decision** until the product owner resolves it. Do not infer an approval from file names, page order or GitHub CI.
7. Maintain previously approved brand tokens unless a subsequent explicit brand decision supersedes them.

## Explicit decision-gate status model

`PENDING_OWNER_DECISION`: source conflict, authority split or release-scope selection remains unresolved.
`APPROVED`: product owner explicitly approved an option; decision record reference, actor and timestamp recorded.
`SUPERSEDED`: a newer signed decision supersedes the prior choice; link both records.
`DEFERRED`: product owner explicitly excluded this behavior from the current release; retain an auditable reason and release target.

The machine-readable `r00-gates.json` stores **non-confidential gate metadata only**. A gate cannot be changed to APPROVED or DEFERRED merely because a source-level test passes. The private R00 packet records original PDF page references, code evidence, alternative solutions and affected requirement IDs.

## Required change control on subsequent feature PRs

Every requirements-correction PR must carry:

- Requirement ID(s) from the privately shared traceability workbook.
- The source specification(s) and version; any known conflicts and governing owner decision.
- Existing implementation paths and proof of real code-level gap.
- UI, API, database, authorization, event-history, and failure-state impact.
- A positive/negative test plan and genuine cross-role acceptance evidence when applicable.
- Expected deploy impact and release flag changes, if any.
- Status: `CODE_PRESENT`, `SOURCE_TESTED`, `STAGING_ACCEPTED`, or `PRODUCTION_ACCEPTED` (never substitute one for another).

**Never deploy disputed transaction-policy changes** without recorded approval. Independent non-conflicting improvements may continue. Reusing working code is preferred unless the approved decision expressly requires a new implementation.

## R00 completion criteria

R00 is *prepared* when the documents have been inventoried, unique source copies identified, the baseline code commit pinned, conflicts identified, and a decision request packet produced.

R00 is *decision-locked* only after all release-blocking gates have explicit decisions and their private evidence references are recorded. A generated report, this file, or a passing CI workflow is not product-owner signoff.

## Production boundary

Source tests and publicly accessible browser checks are insufficient for privileged access, multirole procurement, payments and settlements. Preserve payment, signup and payout fail-closed flags pending separate production acceptance. Keep staging isolated from production and obtain backup/recovery proof before live transactional testing.
