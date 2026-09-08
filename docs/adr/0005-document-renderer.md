# ADR 0005: Document rendering pipeline

- Status: Accepted (development default) — template _source_ is
  explicitly out of scope, see spec §26 item 5
- Date: 2026-09-08

## Context

Spec §13.2 and §16.2 require: a counsel-authored DOCX template renderer
using a reviewed library/licence, and canonical HTML→PDF rendering
through a private (not third-party-SaaS) Playwright/Chromium instance or
private Gotenberg. Rendering must freeze an input snapshot, validate
fields/jurisdiction compatibility, detect unresolved placeholders and
disallowed macros, malware-scan, hash artifacts, and store immutably.

This ADR is about the _pipeline_, not the _content_ — it does not select
which Canadian SAFE template, licence, or merge-field set to use. That
is spec §26 item 5 and requires named Canadian counsel, which this
project has not yet retained. `packages/documents` must remain usable
with zero templates loaded.

## Decision

- **DOCX generation:** merge-field substitution into a counsel-provided
  `.docx` using `docxtemplater` (or an equivalent reviewed,
  actively-maintained library — final selection at Phase 4, subject to a
  licence check) against a Zod-validated variable schema per template
  version. The renderer never string-concatenates into a `.docx`'s XML
  directly.
- **Calculation-report PDF/CSV and canonical HTML→PDF:** render an
  internal HTML representation, then rasterize with a **privately hosted
  Chromium via Playwright** (already available in this environment;
  matches spec's "private Playwright/Chromium" option over a third-party
  SaaS PDF API, which would leak document content to a subprocessor not
  yet disclosed/approved).
- **Pipeline stages** (spec §16.2), implemented as a single Inngest job
  chain (see ADR 0004) so retries can't skip a stage: freeze snapshot →
  validate → render DOCX → placeholder/macro scan → malware scan →
  render PDF → compare against golden fixture (template-version-specific,
  added once real templates exist) → hash (SHA-256) → immutable storage
  write → audit event + outbox event, all in the sense of "each stage
  either fully completes and is recorded, or the whole render is retried
  from the top" — never a partially-completed artifact treated as final.
- Any regeneration (new template version, corrected variable, re-render
  after a bug fix) produces a new artifact row; nothing is overwritten
  (invariant 3).

## Consequences

- No SaaS document-generation API is used, avoiding an undisclosed
  subprocessor handling legal document content — consistent with spec
  §12's data-minimization and disclosed-subprocessor requirements.
- `packages/documents` can be built, typechecked, and unit-tested (schema
  validation, placeholder detection) well before any real template exists
  — golden visual-fixture comparison tests only activate once a template
  is admitted per spec §11 "mandatory review gates."
- Final DOCX-library selection is deferred to Phase 4 in case licence
  terms conflict with counsel's redistribution requirements for the
  admitted template.
