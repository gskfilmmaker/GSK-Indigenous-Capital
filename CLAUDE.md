# GSK Indigenous Capital — SAFE Studio

This repository implements the product, legal-workflow, UX, data, and
architecture specification at
`GSK_Indigenous_Capital___SAFE_Studio__Claude_Code_Master_Specification.md`
in the repo root. Read it in full before making product, legal, data, or
architecture decisions. It is the source of truth for this project.

## Engineering invariants

These are non-negotiable. Any code, migration, prompt, or generated
artifact that violates one of these is a bug, regardless of what else it
accomplishes.

1. Never bypass Postgres RLS or rely only on UI authorization.
2. Never use JS floating point for money, shares, prices, ratios, ownership, or FX.
3. Never overwrite posted ledger entries, executed terms, scenario snapshots, template versions, generated artifacts, approval events, filing receipts, or audit events.
4. Corrections use reversal or superseding records.
5. Every mutation requires authorization, validation, idempotency, audit, and an atomic outbox event.
6. Never log PII, document content, cap-table values, bank data, identity evidence, or community data.
7. Never select a securities exemption, declare investor eligibility, or present app output as legal/tax/accounting/investment advice.
8. Never generate a signature-ready legal document without published counsel-reviewed template, exact variable-set approval, and required board evidence.
9. Never silently approximate unsupported financing terms or numerical non-convergence.
10. Never copy YC source code, UI, copywriting, trade dress, URL schema, or trademarks.
11. Do not call a generated contract an "Indigenous SAFE." Indigenous-centred service design does not change the legal instrument.
12. Do not enable external sending, signing, deployment, or production data changes without explicit authorization.

## Working rhythm

At the end of every phase or step:

1. Run formatting, linting, type checking, unit tests, database tests, accessibility tests, and relevant end-to-end tests.
2. Show the files changed and migrations added.
3. List assumptions, unsupported cases, security concerns, and remaining work.
4. Do not merge, deploy, publish a legal template, send a document, or enable signatures without explicit authorization.
5. Stop and ask when a task would require inventing an operative legal clause, eligibility rule, capitalization definition, rounding policy, investor right, Indigenous identity requirement, privacy retention rule, or unsupported conversion interpretation (see spec §25 final paragraph and §26).

## Repository layout

```text
apps/web                 Next.js App Router application
apps/worker               Durable background jobs (Inngest)
packages/domain            Entities, branded IDs, Zod command/scenario schemas
packages/cap-table         Pure deterministic engine and fixtures — see packages/cap-table/CLAUDE.md
packages/db                Supabase clients, generated types, SQL helpers
packages/authz             Capabilities and authorization helpers
packages/documents         Template schemas and DOCX/PDF renderers — see packages/documents/CLAUDE.md
packages/notifications     Email/reminder logic
packages/audit             Canonical serialization and hash-chain helpers
packages/ui                Design system and accessibility primitives
supabase/migrations        Schema, constraints, RLS, functions, triggers
supabase/tests             pgTAP security and constraint tests
tests/e2e                  Playwright journeys
docs                       ADRs, threat model, privacy inventory, runbooks
```

Dependency direction: UI/API → application commands → domain/calculation
packages → repository interfaces. `packages/cap-table` imports no Next.js,
Supabase, email, browser, or document code — it is pure, deterministic,
and versioned.

## Naming rule

The platform is Indigenous-founder-centred; the legal instrument is not a
special "Indigenous SAFE." Never place that phrase, or any implication
that Indigenous identity creates a securities exemption, valuation rule,
tax result, or unique contract, in product copy or generated documents.
Indigenous identity fields are optional and collected only for a
disclosed feature.

## Legal/compliance posture (product-wide)

- Never render a financing as "compliant," "eligible," or "approved." Use
  the exact state vocabulary in spec §6.3 / §10.
- Never select a securities exemption or declare investor eligibility —
  capture counsel-confirmed categories and evidence only.
- Draft legal document previews/downloads are always watermarked
  `DRAFT — NOT FOR SIGNATURE` until counsel approval + board evidence are
  recorded (spec §6.9, §16).
- Currency is always explicit ISO 4217 (`CAD`), never a bare `$`.

## Open decisions (spec §26)

Several product/legal decisions are not yet made by the owner or counsel.
Development proceeds on the documented defaults (see
`docs/adr/0007-canadian-region-hosting-policy.md` and sibling ADRs, and
spec §26) until the owner changes them. Do not treat a default as a final
decision when generating anything customer-facing or legal.

## Accessibility

WCAG 2.2 AA is a build gate. Every chart ships with an equivalent data
table and a plain-language narrative sentence. See spec §12 and
`/mnt/skills/public/frontend-design/SKILL.md` /
`/mnt/skills/user/frontend-craft/SKILL.md` for craft standards, which
apply to every UI change in this repo.

## Package-specific rules

- `packages/cap-table/CLAUDE.md` — calculation engine invariants.
- `packages/documents/CLAUDE.md` — document generation invariants.
