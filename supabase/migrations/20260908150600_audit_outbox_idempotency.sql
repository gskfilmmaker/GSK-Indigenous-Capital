-- Audit, outbox, and idempotency (spec §9.8, §14-§15, root CLAUDE.md
-- invariants 3 and 5; docs/adr/0006-audit-event-hash-chaining-and-
-- anchoring.md). These three tables are the infrastructure every future
-- mutation-writing migration/command will write to atomically alongside
-- its own domain change — this migration only defines them; wiring a
-- specific command (e.g. createScenario) to write all three in one
-- transaction is future work, not part of Step 4's schema.
--
-- Scope note: periodic Merkle-root anchoring to object storage (ADR 0006)
-- and full chain re-verification are application/worker-side operations
-- (an Inngest job, and a script using packages/audit's canonicalize() —
-- the same algorithm that produces event_hash, which must not be
-- reimplemented in SQL per the ADR's own reasoning). This migration
-- provides only what the database can and should enforce: that every
-- row's prev_event_hash actually matches the previous row's event_hash
-- for that organization, checked atomically at insert time.

-- Defensive: calling a schema-qualified function (authz.has_capability(),
-- etc.) requires USAGE on the containing schema in addition to EXECUTE on
-- the function itself. Every existing RLS policy that calls one of these
-- already works without this grant, because a policy's expression is
-- resolved once at CREATE POLICY time under the (privileged) migration
-- role, not re-resolved per invoking session — but any future server-side
-- code that calls authz.has_capability() or similar directly, outside an
-- RLS policy, would otherwise hit "permission denied for schema authz"
-- exactly as a raw `select auth.uid()` did before this project's local
-- test harness granted USAGE on schema auth (see
-- scripts/dev/local-supabase-harness.sql).
grant usage on schema authz to authenticated;

-- Hash-chained, append-only per root CLAUDE.md invariant 3. event_hash is
-- computed by the caller using packages/audit's canonicalHash() over
-- {prevEventHash, actor, action, resource, payload, occurredAt} (ADR
-- 0006) — the database never computes it, only verifies that
-- prev_event_hash is consistent with what it already has stored.
create table public.audit_events (
  id uuid primary key default public.uuidv7(),
  organization_id uuid not null references public.organizations (id),
  sequence bigint not null,
  prev_event_hash text,
  event_hash text not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 1 and 200),
  resource_type text not null check (char_length(resource_type) between 1 and 200),
  resource_id uuid,
  -- Never cap-table values, document content, bank data, identity
  -- evidence, or community data (root CLAUDE.md invariant 6) — this is a
  -- database-level warning, not an enforced constraint, since the
  -- database cannot judge payload semantics. Callers are responsible for
  -- keeping this to minimal descriptive metadata (e.g. {"scenarioId":
  -- ..., "versionNumber": 2}).
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  unique (organization_id, sequence)
);

comment on table public.audit_events is 'Hash-chained, append-only audit trail (spec §9.8, §15; ADR 0006). sequence/event_hash chain integrity is enforced by audit_events_assign_and_verify_chain(); periodic Merkle anchoring and full recomputation-based verification happen outside the database.';

alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

create policy audit_events_select_with_capability on public.audit_events
  for select
  to authenticated
  using (authz.has_capability(organization_id, 'audit.read'));

-- Any org member may write an audit event about activity in their own
-- organization — the authorization decision for the underlying action was
-- already made at the point that action executed; this insert is that
-- action's own record of itself, not a separately-privileged operation.
-- What must never happen is a member writing an event into another
-- organization's chain, which this policy (and the chain trigger's lock)
-- prevents.
create policy audit_events_insert_own_organization on public.audit_events
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = audit_events.organization_id
        and m.user_id = auth.uid()
    )
  );

-- No update/delete policy or grant: audit events are never edited or
-- removed (root CLAUDE.md invariant 3). Corrections are new, superseding
-- events, never edits to history.
grant select, insert on public.audit_events to authenticated, service_role;

create trigger audit_events_append_only
  before update or delete on public.audit_events
  for each row
  execute function public.reject_update_delete();

-- Assigns `sequence` and verifies `prev_event_hash` against the last
-- stored event for this organization, taking a row lock so concurrent
-- inserts for the same organization serialize rather than race. A caller
-- whose prev_event_hash has gone stale (lost a race) gets a clear
-- exception and must re-read the chain tip and retry — the same
-- optimistic-concurrency shape as any other compare-and-append log.
--
-- security definer (not invoker): `SELECT ... FOR UPDATE` requires UPDATE
-- privilege on the table in Postgres, in addition to SELECT — and
-- `authenticated` deliberately has no UPDATE grant on audit_events at all
-- (append-only). Running this as the function owner, rather than
-- widening that grant, keeps the actual tamper-prevention mechanism
-- exactly what it looks like: no role but this function can ever lock or
-- touch an existing row.
create or replace function public.audit_events_assign_and_verify_chain()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_last public.audit_events;
begin
  select *
  into v_last
  from public.audit_events
  where organization_id = new.organization_id
  order by sequence desc
  limit 1
  for update;

  if not found then
    if new.prev_event_hash is not null then
      raise exception 'audit_events: the first event for an organization must have prev_event_hash = null (genesis)'
        using errcode = '23514';
    end if;
    new.sequence := 1;
  else
    if new.prev_event_hash is distinct from v_last.event_hash then
      raise exception 'audit_events: prev_event_hash does not match the last recorded event_hash for this organization — chain integrity violated'
        using errcode = '23514';
    end if;
    new.sequence := v_last.sequence + 1;
  end if;

  return new;
end;
$$;

comment on function public.audit_events_assign_and_verify_chain() is
  'BEFORE INSERT: assigns the next per-organization sequence number and enforces that prev_event_hash matches the previous event''s event_hash, under a row lock (ADR 0006).';

create trigger audit_events_assign_and_verify_chain
  before insert on public.audit_events
  for each row
  execute function public.audit_events_assign_and_verify_chain();

-- Transactional outbox (spec §14, root CLAUDE.md invariant 5): written by
-- the same request/transaction that performs a mutation, consumed by a
-- worker (Inngest, ADR 0004) that triggers side effects at least once.
-- Not append-only — the worker updates processed_at/attempt_count/
-- last_error in place as it processes each row — but end users never read
-- or write it directly; it is internal plumbing, not user-facing data.
create table public.outbox_events (
  id uuid primary key default public.uuidv7(),
  organization_id uuid not null references public.organizations (id),
  aggregate_type text not null check (char_length(aggregate_type) between 1 and 100),
  aggregate_id uuid not null,
  event_type text not null check (char_length(event_type) between 1 and 200),
  payload jsonb not null default '{}'::jsonb,
  -- Spec §14: "Use organization/company/aggregate concurrency keys" so
  -- retries don't duplicate documents, emails, ledger posts, matches, or
  -- status changes. Computed and supplied by the writer, not derived here
  -- (the right key shape varies per event_type).
  concurrency_key text,
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

comment on table public.outbox_events is 'Transactional outbox (spec §14, root CLAUDE.md invariant 5). Dead-letter visibility for platform admins (spec §14) is deferred to the platform-administration module, not built in Step 4 — for now this table is invisible to end users entirely.';

create index outbox_events_organization_id_idx on public.outbox_events (organization_id);
create index outbox_events_unprocessed_idx on public.outbox_events (created_at) where processed_at is null;

alter table public.outbox_events enable row level security;
alter table public.outbox_events force row level security;

-- Same reasoning as audit_events: any org member may enqueue an outbox
-- event about their own organization's activity (it accompanies an
-- already-authorized mutation), but never read the queue — that's the
-- worker's and, eventually, platform admins' job, not an end-user
-- surface.
create policy outbox_events_insert_own_organization on public.outbox_events
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = outbox_events.organization_id
        and m.user_id = auth.uid()
    )
  );

grant insert on public.outbox_events to authenticated;
grant select, insert, update on public.outbox_events to service_role;

-- Idempotency keys (spec §14, root CLAUDE.md invariant 5): the request-
-- handling layer checks for an existing key before executing a mutation,
-- inserts an in_progress row if absent, and updates it to completed/
-- failed with the cached response afterward — all within the same
-- request, using the caller's own session, unlike outbox/audit which are
-- write-once-then-worker-owned.
create table public.idempotency_keys (
  id uuid primary key default public.uuidv7(),
  organization_id uuid not null references public.organizations (id),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  -- Hash of the request payload, so a key reused with genuinely different
  -- parameters (a client bug) is distinguishable from a legitimate retry
  -- of the exact same request.
  request_hash text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'failed')),
  response jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, idempotency_key)
);

comment on table public.idempotency_keys is 'Request-scoped idempotency records (spec §14, root CLAUDE.md invariant 5) so a retried mutation returns the original result instead of re-executing.';

alter table public.idempotency_keys enable row level security;
alter table public.idempotency_keys force row level security;

create policy idempotency_keys_select_own_organization on public.idempotency_keys
  for select
  to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = idempotency_keys.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy idempotency_keys_insert_own_organization on public.idempotency_keys
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = idempotency_keys.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy idempotency_keys_update_own_organization on public.idempotency_keys
  for update
  to authenticated
  using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = idempotency_keys.organization_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = idempotency_keys.organization_id
        and m.user_id = auth.uid()
    )
  );

-- No delete policy for authenticated: records persist for their effective
-- window; expiry cleanup, if any, is a service_role job.
grant select, insert, update on public.idempotency_keys to authenticated;
grant select, insert, update, delete on public.idempotency_keys to service_role;
