-- Cross-tenant + hash-chain integrity tests for audit_events,
-- outbox_events, idempotency_keys (spec §21 Phase 1 / §25 item 6;
-- ADR 0006 for the hash chain specifically).
begin;
select plan(12);

insert into auth.users (id, email) values
  ('50000000-0000-0000-0000-000000000001', 'alice@example.com'),
  ('50000000-0000-0000-0000-000000000002', 'bob@example.com');

select auth.set_test_session('50000000-0000-0000-0000-000000000001');
select public.create_organization('Alice Co', 'alice-co-05');
select auth.set_test_session('50000000-0000-0000-0000-000000000002');
select public.create_organization('Bob Co', 'bob-co-05');

select auth.set_test_session('50000000-0000-0000-0000-000000000001');
select id as alice_org_id from public.organizations where slug = 'alice-co-05' \gset

-- Genesis event succeeds with sequence 1.
insert into public.audit_events (organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id)
  values (:'alice_org_id', null, 'hash1', auth.uid(), 'scenario.created', 'scenario', '50000000-0000-0000-0000-000000000a01');
select is(
  (select sequence from public.audit_events where event_hash = 'hash1')::int, 1,
  'the first audit event for an organization is assigned sequence 1'
);

-- A correctly chained second event succeeds with sequence 2.
insert into public.audit_events (organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id)
  values (:'alice_org_id', 'hash1', 'hash2', auth.uid(), 'scenario_version.created', 'scenario_version', '50000000-0000-0000-0000-000000000b01');
select is(
  (select sequence from public.audit_events where event_hash = 'hash2')::int, 2,
  'a correctly chained second audit event is assigned sequence 2'
);

-- A stale prev_event_hash is rejected.
select throws_ok(
  format(
    $sql$insert into public.audit_events (organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id)
      values (%L, 'wrong-hash', 'hash3', auth.uid(), 'scenario.archived', 'scenario', '50000000-0000-0000-0000-000000000a01')$sql$,
    :'alice_org_id'
  ),
  'audit_events: prev_event_hash does not match the last recorded event_hash for this organization — chain integrity violated',
  'an audit event with a stale prev_event_hash is rejected'
);

-- A bogus non-null "genesis" on an org with no events yet is rejected.
select auth.set_test_session('50000000-0000-0000-0000-000000000002');
select id as bob_org_id from public.organizations where slug = 'bob-co-05' \gset
select throws_ok(
  format(
    $sql$insert into public.audit_events (organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id)
      values (%L, 'nonexistent', 'hashX', auth.uid(), 'scenario.created', 'scenario', '50000000-0000-0000-0000-000000000a02')$sql$,
    :'bob_org_id'
  ),
  'audit_events: the first event for an organization must have prev_event_hash = null (genesis)',
  'a non-null prev_event_hash on an empty chain is rejected'
);

-- Bob cannot insert into Alice's audit chain.
select throws_ok(
  format(
    $sql$insert into public.audit_events (organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id)
      values (%L, 'hash2', 'hash3', auth.uid(), 'scenario.archived', 'scenario', '50000000-0000-0000-0000-000000000a01')$sql$,
    :'alice_org_id'
  ),
  'new row violates row-level security policy for table "audit_events"',
  'Bob cannot insert an audit event into Alice''s organization''s chain'
);

-- Bob cannot read Alice's audit events.
select is(
  (select count(*) from public.audit_events)::int, 0,
  'Bob sees zero of Alice''s audit events'
);

-- Append-only: no UPDATE grant exists on audit_events at all.
select auth.set_test_session('50000000-0000-0000-0000-000000000001');
select throws_ok(
  format($sql$update public.audit_events set action = 'tampered' where organization_id = %L$sql$, :'alice_org_id'),
  'permission denied for table audit_events',
  'audit_events cannot be updated — no such grant exists'
);

-- Outbox: an org member can enqueue an event but never read the queue.
select lives_ok(
  format(
    $sql$insert into public.outbox_events (organization_id, aggregate_type, aggregate_id, event_type)
      values (%L, 'scenario', '50000000-0000-0000-0000-000000000a01', 'scenario.snapshot.frozen')$sql$,
    :'alice_org_id'
  ),
  'Alice can enqueue an outbox event for her own organization'
);
select throws_ok(
  'select count(*) from public.outbox_events',
  'permission denied for table outbox_events',
  'outbox_events has no SELECT grant for authenticated at all'
);

-- Idempotency: an org member can insert/select/update her own org's
-- record, and it's invisible to a different organization.
select lives_ok(
  format(
    $sql$insert into public.idempotency_keys (organization_id, idempotency_key, request_hash)
      values (%L, 'req-123', 'reqhash')$sql$,
    :'alice_org_id'
  ),
  'Alice can insert an idempotency key for her own organization'
);
select is(
  (select count(*) from public.idempotency_keys)::int, 1,
  'Alice sees exactly her one idempotency key'
);

select auth.set_test_session('50000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.idempotency_keys)::int, 0,
  'Bob sees zero of Alice''s idempotency keys'
);

select * from finish();
rollback;
