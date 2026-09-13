# ADR 0009: Deal-screening document upload and retention policy

- Status: Proposed default (development), pending owner decision — spec
  §26 explicitly reserves privacy retention rules for the owner/counsel;
  this is a documented starting point, not that decision
- Date: 2026-09-13

## Context

The deal-screening feature needs founders to upload real documents
(pitch decks, financial statements, cap-table exports) so an investor
can screen them. Those documents are exactly the categories root
`CLAUDE.md` invariant 6 names as never to be logged — and now, for the
first time in this codebase, they are also being *stored*, which needs
its own retention rule rather than inheriting one by accident.

## Decision

Until the owner makes a different explicit choice:

1. **Storage.** Uploaded documents go into a Supabase Storage bucket
   dedicated to this feature, private by default, with the same
   RLS-backed access-control discipline as every table in this project
   (root `CLAUDE.md` invariant 1): a founder can read/replace only their
   own uploads; an investor can read only documents belonging to a
   startup that has actually been submitted into one of their screening
   threads, never the whole bucket.
2. **Retention window.** A document is retained for as long as the
   `startup_intakes` row it belongs to is active, plus 90 days after
   either party (founder or investor) archives that screening
   relationship — long enough for a founder to revisit feedback, short
   enough that stale sensitive financials do not accumulate indefinitely.
   After that window, a scheduled job deletes the underlying file
   (Storage) and the row is superseded with its content fields cleared,
   never silently kept "just in case."
3. **Founder-initiated deletion.** A founder can request deletion of
   their intake and its documents at any time before an investor has
   recorded a decision against it; per root `CLAUDE.md` invariant 4,
   this is a superseding "withdrawn" record, not a row deleted out from
   under an audit trail that already references it.
4. **No AI training use.** Per ADR 0008, the extraction provider's terms
   already forbid training on this content by default — this rule exists
   independently of that vendor commitment, so it survives a future
   change of vendor: this project's own policy is that founder documents
   are never used to train or fine-tune any model, by this project or a
   subprocessor, without a separate, explicit, revocable consent.
5. **Community/Indigenous data gets ADR 0007's stricter default**, not
   this one: if a startup's intake carries any flagged Indigenous
   identity or community data field, that field is excluded from the
   AI-extraction payload entirely and handled per ADR 0007 rule 3, not
   sent to the extraction subprocessor under this ADR's general rule.

## Consequences

- This is a development default, not a signed privacy policy. It must
  be reviewed against real counsel input and folded into
  `docs/privacy-inventory.md` before this feature reaches real founders
  in production — the same gate every other "proposed default" ADR in
  this project carries.
- The 90-day post-archive window and the "before a decision is recorded"
  deletion cutoff are both engineering defaults chosen for this ADR;
  either number is the owner's to change, not a value to silently drift
  in code without updating this document first.
