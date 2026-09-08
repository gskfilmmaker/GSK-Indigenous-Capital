# ADR 0007: Canadian-region hosting and subprocessor policy

- Status: Proposed default (development), pending owner decision —
  spec §26 item 11 is explicitly an open decision
- Date: 2026-09-08

## Context

Spec §12 (PIPEDA-aligned requirements): "default to Canadian regions
when commercially and contractually available, while accurately
disclosing subprocessors and cross-border processing." Spec §13.2
recommends Supabase with a Canadian region "if available and suitable."
Indigenous/community data additionally requires disabled
analytics/AI-training by default and no cross-border movement without a
data-use agreement (spec §12).

This project has not yet selected final hosting accounts, so this ADR
records the _policy_, not a signed contract or verified region
availability.

## Decision

Until the owner makes a different explicit choice:

1. **Primary datastore (Supabase Postgres/Storage/Auth):** provision in a
   Canadian region if the plan tier in use supports it at the time of
   provisioning; if not available, use the nearest available region and
   record the gap in `docs/privacy-inventory.md` (created in Phase 0/1
   privacy work, not this Step 1 scaffold) as a disclosed cross-border
   processing item, not a silent default.
2. **Every subprocessor is disclosed before use.** Inngest (ADR 0004),
   Resend (transactional email, spec §13.2), Sentry (error tracking),
   and the audit anchor object-storage bucket (ADR 0006) are each
   recorded with: purpose, data categories touched, region, and whether
   PII/document-content ever reaches them. Per invariant 6, none of these
   subprocessors receive PII, document content, cap-table values, bank
   data, identity evidence, or community data in logs/error breadcrumbs —
   see error-reporting scrubbing rules to be implemented alongside
   Sentry setup in Step 4.
3. **Indigenous/community data gets a stricter default,** not the same
   default as ordinary tenant data: analytics/AI-training is off by
   default for any row flagged as community data (spec §12), and such
   data is not sent to any subprocessor without a recorded data-use
   agreement, regardless of that subprocessor's general region policy.
4. **This policy is reviewed, not assumed final,** once real vendor
   contracts are signed — a signed Data Processing Addendum / region
   guarantee supersedes the "if available" language above.

## Consequences

- Nothing in Step 1–4 of this build depends on a specific verified
  region; the code must not hardcode a region assumption that would
  break if the owner later requires a stricter Canada-only posture.
- A privacy inventory and subprocessor list (spec §12) must exist before
  production pilot (spec §22 definition of done) — this ADR is a
  placeholder for that inventory's hosting section, not a replacement
  for it.
