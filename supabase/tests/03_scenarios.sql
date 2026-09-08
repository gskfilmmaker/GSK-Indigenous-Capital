-- Cross-tenant RLS + append-only tests for the scenario chain: scenarios,
-- scenario_versions, scenario_runs, scenario_snapshots (spec §21 Phase 1
-- / §25 item 6; root CLAUDE.md invariant 3 for the append-only tables).
begin;
select plan(11);

insert into auth.users (id, email) values
  ('30000000-0000-0000-0000-000000000001', 'alice@example.com'),
  ('30000000-0000-0000-0000-000000000002', 'bob@example.com');

select auth.set_test_session('30000000-0000-0000-0000-000000000001');
select public.create_organization('Alice Co', 'alice-co-03');
select auth.set_test_session('30000000-0000-0000-0000-000000000002');
select public.create_organization('Bob Co', 'bob-co-03');

select auth.set_test_session('30000000-0000-0000-0000-000000000001');
insert into public.companies (id, organization_id, legal_name)
  values (
    '30000000-0000-0000-0000-0000000000c1',
    (select id from public.organizations where slug = 'alice-co-03'),
    'Alice Startup Inc.'
  );

insert into public.scenarios (id, company_id, name)
  values ('30000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000c1', 'Seed Round Model');

insert into public.scenario_versions (id, scenario_id, version_number, input, input_schema_version, input_hash, created_by)
  values (
    '30000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000a1', 1,
    '{"id":"scn_1","schemaVersion":1,"currency":"CAD","existingCapitalization":{"founders":"1","grantedOptions":"0","unissuedPool":"0"},"safes":[]}'::jsonb,
    1, 'deadbeef', auth.uid()
  );

insert into public.scenario_runs (id, scenario_id, scenario_version_id, engine_version, status, output, output_hash, requested_by)
  values (
    '30000000-0000-0000-0000-0000000000d1', '30000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000b1',
    '0.0.0', 'succeeded', '{"rows":[],"totalSafeOwnership":"0","legacyOwnership":"1"}'::jsonb, 'cafebabe', auth.uid()
  );

insert into public.scenario_snapshots (id, scenario_id, scenario_version_id, scenario_run_id, input, output, engine_version, input_schema_version, input_hash, output_hash, frozen_by)
  values (
    '30000000-0000-0000-0000-0000000000e1', '30000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000d1',
    '{"id":"scn_1","schemaVersion":1,"currency":"CAD","existingCapitalization":{"founders":"1","grantedOptions":"0","unissuedPool":"0"},"safes":[]}'::jsonb,
    '{"rows":[],"totalSafeOwnership":"0","legacyOwnership":"1"}'::jsonb, '0.0.0', 1, 'deadbeef', 'cafebabe', auth.uid()
  );

-- Alice sees her full chain.
select is((select count(*) from public.scenarios)::int, 1, 'Alice sees her one scenario');
select is((select count(*) from public.scenario_versions)::int, 1, 'Alice sees her one scenario_version');
select is((select count(*) from public.scenario_runs)::int, 1, 'Alice sees her one scenario_run');
select is((select count(*) from public.scenario_snapshots)::int, 1, 'Alice sees her one scenario_snapshot');

-- Bob (different org) sees none of it.
select auth.set_test_session('30000000-0000-0000-0000-000000000002');
select is((select count(*) from public.scenarios)::int, 0, 'Bob sees zero scenarios');
select is((select count(*) from public.scenario_versions)::int, 0, 'Bob sees zero scenario_versions');
select is((select count(*) from public.scenario_runs)::int, 0, 'Bob sees zero scenario_runs');
select is((select count(*) from public.scenario_snapshots)::int, 0, 'Bob sees zero scenario_snapshots');

-- Append-only enforcement on the three history tables.
select auth.set_test_session('30000000-0000-0000-0000-000000000001');
select throws_ok(
  $sql$update public.scenario_versions set input_hash = 'tampered' where id = '30000000-0000-0000-0000-0000000000b1'$sql$,
  'permission denied for table scenario_versions',
  'scenario_versions cannot be updated — append-only'
);
select throws_ok(
  $sql$delete from public.scenario_runs where id = '30000000-0000-0000-0000-0000000000d1'$sql$,
  'permission denied for table scenario_runs',
  'scenario_runs cannot be deleted — append-only'
);

-- scenario_runs outcome consistency: a failed run may not carry output.
select throws_ok(
  format(
    $sql$insert into public.scenario_runs (scenario_id, scenario_version_id, engine_version, status, output, error_code)
      values ('30000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000b1', '0.0.0', 'failed', '{"bogus":true}'::jsonb, 'UNSUPPORTED_CASE')$sql$
  ),
  'new row for relation "scenario_runs" violates check constraint "scenario_runs_outcome_consistency"',
  'a failed scenario_run carrying output is rejected'
);

select * from finish();
rollback;
