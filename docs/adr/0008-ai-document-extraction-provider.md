# ADR 0008: AI document-extraction provider for deal screening

- Status: Proposed default (development), pending owner decision — this
  is a new disclosed subprocessor under ADR 0007 rule 2, not yet a
  signed vendor agreement
- Date: 2026-09-13

## Context

The deal-screening feature (`packages/deal-screening`, see its own
CLAUDE.md) needs to turn a founder's uploaded, unstructured documents —
pitch decks, financial statements, cap tables — into the structured
`StartupIntake` fields that engine consumes. That extraction step
necessarily sends document content to whichever service performs it,
which is exactly the category root `CLAUDE.md` invariant 6 says must
never be logged (PII, document content, cap-table values, bank data,
identity evidence) — invariant 6 governs logging, but the same
sensitivity applies to *choosing who processes it at all*, which is
what this ADR decides.

This is a new subprocessor, so ADR 0007 rule 2 applies in full: purpose,
data categories touched, region, and PII/document-content exposure must
be recorded here before use, not assumed.

## Decision

Use the **Anthropic Claude API** for document extraction, until the
owner makes a different explicit choice.

**Why this vendor, not another:**

- This project is already built with Claude Code; a single AI vendor
  relationship is one less subprocessor to disclose, one fewer set of
  terms to review, and one fewer place sensitive founder documents can
  leak from.
- Anthropic's Commercial Terms of Service state models are not trained
  on Claude API customer content by default, and API inputs/outputs are
  deleted within a 30-day baseline retention window (see sources below)
  — a materially better starting posture than a consumer-tier AI
  product with no such commitment.
- **Zero Data Retention (ZDR)** is available to qualifying enterprise
  API customers — inputs/outputs are not stored at all beyond abuse
  screening, and never used for training. **Action for the owner:**
  apply for ZDR before this feature handles real founder documents in
  production; the 30-day default retention is the fallback, not the
  target state.
- Claude's native PDF/document understanding avoids a separate
  OCR/parsing vendor, which would be a second subprocessor to disclose.

**What this does not decide:** data residency. As of this writing,
Anthropic's standard API is not region-pinned to Canada — this is a
real gap against spec §12's "default to Canadian regions when
commercially and contractually available" language, disclosed here
rather than hidden. If the owner requires a hard Canada-only guarantee
for this specific data category, Anthropic via AWS Bedrock in a
Canadian AWS region is the documented alternative to evaluate before
launch — not silently substituted by whichever is easiest to wire up.

**Founder consent, not silent default:** documents are sent to this
subprocessor only when a founder affirmatively uploads them for
screening — never pulled from elsewhere, never sent without the
founder having taken that action knowingly, and the upload flow must
disclose this subprocessor by name (spec §12's disclosure requirement,
not a buried terms-of-service line).

## Consequences

- `ANTHROPIC_API_KEY` becomes a required environment variable for this
  feature specifically (separate from any Claude Code session
  credential — a distinct, product-owned API key with its own billing
  and scope). It does not exist yet; this feature is inert without it.
  The owner must generate it from their own Anthropic Console account —
  no one else can generate or supply it — and add it via Vercel Project
  Settings → Environment Variables, the same pattern already used for
  the Supabase keys.
- Until ZDR is confirmed, this feature must not process real production
  founder documents at pilot scale without the owner's explicit
  sign-off, given the 30-day default retention gap noted above.
- This ADR's data-residency gap must be resolved (not just disclosed)
  before this repository's privacy inventory (ADR 0007, spec §12) is
  considered complete.

## Sources

- [Anthropic Privacy Policy Review — terms.law](https://terms.law/Privacy-Watchdog/ai-services/anthropic/)
- [Claude API Data Retention: ZDR, Training & Commercial Terms — Voibe](https://www.getvoibe.com/resources/claude-api-data-retention/)
- [AI Data Retention: ChatGPT, Claude, Gemini Policies — Witness AI](https://witness.ai/blog/ai-data-retention/)
