# packages/documents

Template registry schemas and DOCX/PDF renderers. See root `CLAUDE.md`
for repository-wide invariants; this file adds rules specific to this
package.

## Two products, never conflated

1. **Calculation reports** — PDF/CSV exports of scenario inputs, outputs,
   formulas, assumptions, timestamp, engine version, and disclaimer. Not
   a legal document. May be generated freely from a scenario run.
2. **Legal documents** — generated only from a _published, counsel-
   reviewed template version_ and an _immutable variable snapshot_. Never
   generate a legal-document artifact from an unpublished or unreviewed
   template version, and never regenerate one from a mutated variable set
   without creating a new template/document version.

## Watermarking

Every legal-document preview or download is watermarked
`DRAFT — NOT FOR SIGNATURE` until:

- the exact template version has counsel-recorded approval, and
- the exact variable set matches what counsel approved (hash-bound), and
- required board approval evidence is recorded.

The watermark is a rendering-time gate this package enforces — never rely
on the caller (UI/API) to decide whether to show it.

## Template integrity

- Every template version stores an immutable original artifact and its
  SHA-256. Never mutate a stored template artifact in place; a change is
  a new version.
- Rendering freezes an input snapshot, validates fields and
  jurisdiction/template compatibility, detects unresolved placeholders
  and disallowed macros, and hashes output artifacts before storage
  (spec §16.2). Any unresolved placeholder blocks final generation.
- Never modify an official third-party form (e.g. YC's SAFE) and continue
  representing it as that standard form. Never embed or redistribute a
  template without recorded legal/IP review (spec §16.1).
- Altering one byte of a document after signature must invalidate hash
  verification — never silently accept a mismatched hash as "close
  enough."

## Naming

Never label a generated instrument an "Indigenous SAFE" or imply
Indigenous identity changes the legal instrument, exemption, or terms.

## No legal authorship

This package renders counsel-authored templates with data. It never
invents, infers, or auto-drafts an operative legal clause. If a required
variable, clause choice, or jurisdiction branch is not covered by an
approved template, fail closed and surface the gap — do not improvise
contract language.
