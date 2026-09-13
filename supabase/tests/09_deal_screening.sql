-- Cross-tenant RLS + command tests for the deal-screening schema
-- (20260913100000_deal_screening_schema.sql,
-- 20260913100100_run_screening_command.sql,
-- 20260913100200_thesis_and_intake_commands.sql). Spec §21 Phase 1 / §25
-- item 6 pattern, same as every other Step 4 table.
begin;
select plan(12);

insert into auth.users (id, email) values
  ('90000000-0000-0000-0000-000000000001', 'alice90@example.com'),
  ('90000000-0000-0000-0000-000000000002', 'bob90@example.com');

select auth.set_test_session('90000000-0000-0000-0000-000000000001');
select public.create_organization('Alice Capital', 'alice-capital-09');
select id as alice_org_id from public.organizations where slug = 'alice-capital-09' \gset

select auth.set_test_session('90000000-0000-0000-0000-000000000002');
select public.create_organization('Bob Capital', 'bob-capital-09');
select id as bob_org_id from public.organizations where slug = 'bob-capital-09' \gset

-- create_investor_thesis(): golden path, then cross-tenant isolation.
select auth.set_test_session('90000000-0000-0000-0000-000000000001');
select (public.create_investor_thesis(
  :'alice_org_id'::uuid,
  public.uuidv7(),
  '{"name": "Alice''s seed thesis", "criteria": [{"metric": "ltvToCacRatio", "label": "LTV:CAC", "comparator": "gte", "threshold": "3"}]}'::jsonb,
  'idem-thesis-1', 'reqhash-thesis-1', null, 'event-hash-thesis-1'
)).id as thesis_id \gset

select is(
  (select count(*) from public.investor_theses)::int, 1,
  'Alice sees exactly one thesis (her own)'
);

select auth.set_test_session('90000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.investor_theses)::int, 0,
  'Bob sees zero theses (Alice''s is invisible to him)'
);

-- create_startup_intake(): golden path, then cross-tenant isolation.
select auth.set_test_session('90000000-0000-0000-0000-000000000001');
-- Chains off the audit event create_investor_thesis just wrote for this
-- same organization — audit_events_assign_and_verify_chain() rejects a
-- prev_event_hash that doesn't match the real chain tip (ADR 0006).
select (public.create_startup_intake(
  :'alice_org_id'::uuid,
  public.uuidv7(),
  '{"companyName": "HYDRIX Systems Inc.", "industry": "SaaS", "stage": "seed", "intakeData": {}}'::jsonb,
  'idem-intake-1', 'reqhash-intake-1', 'event-hash-thesis-1', 'event-hash-intake-1'
)).id as intake_id \gset

select is(
  (select count(*) from public.startup_intakes)::int, 1,
  'Alice sees exactly one intake (her own)'
);
select is(
  (select company_name from public.startup_intakes where id = :'intake_id'), 'HYDRIX Systems Inc.',
  'company_name round-trips correctly through create_startup_intake'
);

select auth.set_test_session('90000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.startup_intakes)::int, 0,
  'Bob sees zero intakes (Alice''s is invisible to him)'
);

select throws_ok(
  format(
    $sql$select public.create_startup_intake(%L::uuid, public.uuidv7(), '{"companyName": "Hijack Inc.", "industry": "SaaS", "stage": "seed", "intakeData": {}}'::jsonb, 'idem-hijack', 'reqhash-hijack', null, 'event-hash-hijack')$sql$,
    :'alice_org_id'
  ),
  'new row violates row-level security policy for table "idempotency_keys"',
  'Bob cannot submit an intake into Alice''s organization'
);

-- run_screening(): golden path. Chains off create_startup_intake's audit
-- event, same reasoning as above.
select auth.set_test_session('90000000-0000-0000-0000-000000000001');
select public.uuidv7() as snapshot_id \gset
select (public.run_screening(
  :'intake_id'::uuid,
  null,
  :'snapshot_id'::uuid,
  '{"exitValue": "150000000"}'::jsonb,
  '{"vcMethod": {"impliedMultiple": "15.5"}, "redFlags": []}'::jsonb,
  '1',
  'inputhash1',
  'outputhash1',
  'idem-screening-1',
  'reqhash-screening-1',
  'event-hash-intake-1',
  'event-hash-screening-1'
)).id as result_snapshot_id \gset

select is(
  :'result_snapshot_id'::uuid, :'snapshot_id'::uuid,
  'run_screening creates a snapshot with the client-supplied id'
);
select is(
  (select output ->> 'redFlags' from public.screening_snapshots where id = :'snapshot_id'), '[]',
  'the output jsonb round-trips correctly'
);

-- Append-only: no update or delete is possible, even by the org that owns it.
select throws_ok(
  format(
    $sql$update public.screening_snapshots set output_hash = 'tampered' where id = %L::uuid$sql$,
    :'snapshot_id'
  ),
  'permission denied for table screening_snapshots',
  'screening_snapshots cannot be updated — append-only (no UPDATE grant exists)'
);
select throws_ok(
  format(
    $sql$delete from public.screening_snapshots where id = %L::uuid$sql$,
    :'snapshot_id'
  ),
  'permission denied for table screening_snapshots',
  'screening_snapshots cannot be deleted — append-only (no DELETE grant exists)'
);

-- Belt-and-suspenders: the table itself rejects a collapsed verdict/score
-- field in output, independent of the application-layer discipline in
-- packages/deal-screening never producing one.
select throws_ok(
  format(
    $sql$select public.run_screening(%L::uuid, null, public.uuidv7(), '{}'::jsonb, '{"verdict": "invest"}'::jsonb, '1', 'ih', 'oh', 'idem-verdict-attempt', 'rh-verdict', null, 'eh-verdict')$sql$,
    :'intake_id'
  ),
  'new row for relation "screening_snapshots" violates check constraint "screening_snapshots_output_never_a_verdict"',
  'persisting an output containing a "verdict" key is rejected at the database layer'
);

-- Bob cannot run screening against Alice's intake — RLS hides its
-- existence from him entirely (his own SELECT sees zero rows), so this
-- fails as "not found" rather than confirming the intake exists and he
-- merely lacks a capability. Same shape as save_scenario()'s "company
-- not found" for an out-of-org company id.
select auth.set_test_session('90000000-0000-0000-0000-000000000002');
select throws_ok(
  format(
    $sql$select public.run_screening(%L::uuid, null, public.uuidv7(), '{}'::jsonb, '{}'::jsonb, '1', 'ih', 'oh', 'idem-bob-attempt', 'rh-bob', null, 'eh-bob')$sql$,
    :'intake_id'
  ),
  'startup intake not found',
  'Bob cannot run screening against Alice''s intake — RLS hides it from him entirely'
);

select * from finish();
rollback;
