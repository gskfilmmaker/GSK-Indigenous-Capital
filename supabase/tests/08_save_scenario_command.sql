-- save_scenario() (20260908150900_save_scenario_command.sql): mirrors
-- 07_create_company_command.sql's coverage, plus the version-numbering
-- behaviour specific to scenarios (each save either creates a scenario
-- or appends a new version to an existing one).
begin;
select plan(12);

insert into auth.users (id, email) values
  ('80000000-0000-0000-0000-000000000001', 'owner08@example.com'),
  ('80000000-0000-0000-0000-000000000002', 'viewer08@example.com'),
  ('80000000-0000-0000-0000-000000000003', 'outsider08@example.com');

select auth.set_test_session('80000000-0000-0000-0000-000000000001');
select public.create_organization('Scenario Command Co', 'scenario-command-co-08');
select id as org_id from public.organizations where slug = 'scenario-command-co-08' \gset

insert into public.organization_memberships (organization_id, user_id, role)
  values (:'org_id', '80000000-0000-0000-0000-000000000002', 'viewer');

select (public.create_company(
  :'org_id'::uuid, public.uuidv7(), '{"legalName": "Scenario Command Startup Inc."}'::jsonb,
  'idem-company-08', 'reqhash-company-08', null, 'event-hash-company-08'
)).id as company_id \gset

-- Authorization: a viewer (scenario.read only, no scenario.write) cannot
-- save a scenario.
select auth.set_test_session('80000000-0000-0000-0000-000000000002');
select throws_ok(
  format(
    $sql$select public.save_scenario(%L::uuid, public.uuidv7(), 'Should Not Exist', '{}'::jsonb, 1, 'h', '1', 'succeeded', '{}'::jsonb, 'oh', null, null, 'viewer-attempt', 'rh-v', null, 'eh-v')$sql$,
    :'company_id'
  ),
  'new row violates row-level security policy for table "scenarios"',
  'a viewer without scenario.write cannot save a scenario'
);

-- A non-member cannot save a scenario against another organization's
-- company. They fail even earlier than the viewer above: RLS on
-- `companies` SELECT (company.read) hides the row from them entirely,
-- before this function ever resolves an organization_id to scope
-- anything else against.
select auth.set_test_session('80000000-0000-0000-0000-000000000003');
select throws_ok(
  format(
    $sql$select public.save_scenario(%L::uuid, public.uuidv7(), 'Outsider Scenario', '{}'::jsonb, 1, 'h', '1', 'succeeded', '{}'::jsonb, 'oh', null, null, 'outsider-attempt', 'rh-o', null, 'eh-o')$sql$,
    :'company_id'
  ),
  'company not found',
  'a non-member cannot save a scenario against another organization''s company'
);

-- First save by the owner: creates the scenario and version 1.
select auth.set_test_session('80000000-0000-0000-0000-000000000001');
select public.uuidv7() as scenario_id \gset
select public.save_scenario(
  :'company_id'::uuid, :'scenario_id'::uuid, 'My Scenario',
  '{"schemaVersion": 1, "currency": "CAD"}'::jsonb, 1, 'input-hash-1',
  '1', 'succeeded', '{"totalCapSafeOwnership": "0.10"}'::jsonb, 'output-hash-1', null, null,
  'idem-save-1', 'reqhash-save-1', 'event-hash-company-08', 'event-hash-save-1'
) as save1_result \gset

select is(
  (:'save1_result'::jsonb ->> 'versionNumber')::int, 1,
  'the first save creates version 1'
);
select is(
  (select status from public.scenarios where id = :'scenario_id'), 'succeeded',
  'the scenario''s status reflects the run outcome'
);
select is(
  (select count(*)::int from public.scenario_versions where scenario_id = :'scenario_id'), 1,
  'exactly one version exists after the first save'
);

-- Second save with the same scenario id: appends version 2, not a new scenario.
select public.save_scenario(
  :'company_id'::uuid, :'scenario_id'::uuid, 'My Scenario',
  '{"schemaVersion": 1, "currency": "CAD", "safes": []}'::jsonb, 1, 'input-hash-2',
  '1', 'succeeded', '{"totalCapSafeOwnership": "0.15"}'::jsonb, 'output-hash-2', null, null,
  'idem-save-2', 'reqhash-save-2', 'event-hash-save-1', 'event-hash-save-2'
) as save2_result \gset
select is(
  (:'save2_result'::jsonb ->> 'versionNumber')::int, 2,
  'the second save on the same scenario creates version 2'
);
select is(
  (select count(*)::int from public.scenarios where id = :'scenario_id'), 1,
  'still exactly one scenario row — the second save did not create a duplicate scenario'
);

-- A failed engine run is recorded as such, not silently coerced to succeeded.
select public.uuidv7() as failing_scenario_id \gset
select public.save_scenario(
  :'company_id'::uuid, :'failing_scenario_id'::uuid, 'An Unsupported Scenario',
  '{"schemaVersion": 1}'::jsonb, 1, 'input-hash-f',
  '1', 'failed', null, null, 'UNSUPPORTED_CASE', 'complex MFN chain is not supported',
  'idem-save-fail', 'reqhash-save-fail', 'event-hash-save-2', 'event-hash-save-fail'
);
select is(
  (select status from public.scenarios where id = :'failing_scenario_id'), 'failed',
  'a failed engine run is recorded as failed, not silently marked succeeded'
);

-- Idempotency: a retry with the same key and request hash returns the
-- original cached result and does not create a third version.
select public.save_scenario(
  :'company_id'::uuid, :'scenario_id'::uuid, 'My Scenario',
  '{"schemaVersion": 1, "currency": "CAD"}'::jsonb, 1, 'input-hash-1',
  '1', 'succeeded', '{"totalCapSafeOwnership": "0.10"}'::jsonb, 'output-hash-1', null, null,
  'idem-save-1', 'reqhash-save-1', 'event-hash-company-08', 'event-hash-save-1'
) as retried_result \gset
select is(
  :'retried_result'::jsonb, :'save1_result'::jsonb,
  'retrying the first save with the same idempotency key returns the original cached result'
);
select is(
  (select count(*)::int from public.scenario_versions where scenario_id = :'scenario_id'), 2,
  'the retry did not create a third version'
);

-- A different request payload under the same idempotency key is rejected.
select throws_ok(
  format(
    $sql$select public.save_scenario(%L::uuid, %L::uuid, 'Different Scenario', '{}'::jsonb, 1, 'different-hash', '1', 'succeeded', '{}'::jsonb, 'oh', null, null, 'idem-save-1', 'reqhash-DIFFERENT', 'event-hash-company-08', 'eh-different')$sql$,
    :'company_id', :'scenario_id'
  ),
  'idempotency key reused with a different request payload',
  'reusing an idempotency key with a different request payload is rejected'
);

-- A key already marked in_progress (a genuine concurrent duplicate) is rejected.
insert into public.idempotency_keys (organization_id, idempotency_key, request_hash, status)
  values (:'org_id', 'idem-save-inflight', 'reqhash-inflight', 'in_progress');
select throws_ok(
  format(
    $sql$select public.save_scenario(%L::uuid, public.uuidv7(), 'In Flight', '{}'::jsonb, 1, 'h', '1', 'succeeded', '{}'::jsonb, 'oh', null, null, 'idem-save-inflight', 'reqhash-inflight', null, 'eh-inflight')$sql$,
    :'company_id'
  ),
  'a request with this idempotency key is already in progress',
  'a key already in_progress (a concurrent duplicate) is rejected'
);

select * from finish();
rollback;
