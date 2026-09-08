# ADR 0004: Background job / durable workflow provider

- Status: Accepted (development default)
- Date: 2026-09-08

## Context

Spec §13.2 recommends Inngest or Trigger.dev for durable jobs: retries,
schedules, concurrency keys, and dead letters. Spec §17 lists the
concrete jobs (scenario run, projection rebuild, snapshot/export
generation, DOCX/PDF render + scan, reminder/deadline evaluation, email
delivery processing, bank CSV normalization/matching, audit-chain
anchoring, retention/deletion/legal-hold processing, privacy-incident
reminders, template/version retirement warnings) and requires
organization/company/aggregate concurrency keys and idempotent retries
(never duplicate a document, email, ledger post, match, or status
change).

## Decision

Use **Inngest** as the durable background job provider for `apps/worker`.

- Every job is a discrete Inngest function triggered by an
  `outbox_events` row (transactional outbox pattern, spec §14) — the
  originating transaction commits the domain change, audit event, and
  outbox event atomically; a relay step (either Postgres `LISTEN/NOTIFY`
  fed into an Inngest send, or a polling dispatcher) turns outbox rows
  into Inngest events.
- Concurrency keys use `organization_id` plus the relevant aggregate id
  (e.g. `company_id` for cap-table projection rebuilds) so two jobs for
  the same tenant/aggregate never race.
- Every job handler is idempotent against its own event id (Inngest's
  built-in idempotency/step memoization) _and_ against the domain-level
  `idempotency_keys` table for anything that produces a user-visible
  side effect (email send, document artifact, ledger post), so a
  redelivered event cannot duplicate output even across a full job
  restart.
- Failed jobs after configured retries land in Inngest's dashboard as
  inspectable failures; a thin admin view (`/admin/jobs`, deferred past
  Step 1) surfaces dead letters to authorized platform admins with safe
  retry, per spec §17.

## Consequences

- Inngest is a hosted/self-hostable service; region and subprocessor
  disclosure for it fall under ADR 0007 and spec §26 item 11 review.
- Trigger.dev remains a documented alternative if Inngest's Canadian
  hosting/region story is unacceptable at pilot time — this ADR should be
  revisited then, not silently overridden by whichever library is
  easiest to install.
