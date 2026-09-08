-- Cross-tenant + anonymous-access tests for snapshot_share_links and
-- snapshot_access_events (spec §21 Phase 1 / §25 item 6).
begin;
select plan(8);

insert into auth.users (id, email) values
  ('40000000-0000-0000-0000-000000000001', 'alice@example.com'),
  ('40000000-0000-0000-0000-000000000002', 'bob@example.com');

select auth.set_test_session('40000000-0000-0000-0000-000000000001');
select public.create_organization('Alice Co', 'alice-co-04');
select auth.set_test_session('40000000-0000-0000-0000-000000000002');
select public.create_organization('Bob Co', 'bob-co-04');

select auth.set_test_session('40000000-0000-0000-0000-000000000001');
insert into public.companies (id, organization_id, legal_name)
  values ('40000000-0000-0000-0000-0000000000c1', (select id from public.organizations where slug = 'alice-co-04'), 'Alice Startup Inc.');
insert into public.scenarios (id, company_id, name)
  values ('40000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000c1', 'Seed Round Model');
insert into public.scenario_versions (id, scenario_id, version_number, input, input_schema_version, input_hash, created_by)
  values ('40000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000a1', 1, '{}'::jsonb, 1, 'deadbeef', auth.uid());
insert into public.scenario_runs (id, scenario_id, scenario_version_id, engine_version, status, output, output_hash, requested_by)
  values ('40000000-0000-0000-0000-0000000000d1', '40000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000b1', '0.0.0', 'succeeded', '{}'::jsonb, 'cafebabe', auth.uid());
insert into public.scenario_snapshots (id, scenario_id, scenario_version_id, scenario_run_id, input, output, engine_version, input_schema_version, input_hash, output_hash, frozen_by)
  values ('40000000-0000-0000-0000-0000000000e1', '40000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000d1', '{}'::jsonb, '{}'::jsonb, '0.0.0', 1, 'deadbeef', 'cafebabe', auth.uid());

select raw_token as alice_token from public.create_snapshot_share_link('40000000-0000-0000-0000-0000000000e1', null) \gset

-- anon can resolve the valid token and gets the snapshot back.
select auth.set_test_session(null, 'anon');
select is(
  (select id from public.get_snapshot_by_share_token(:'alice_token')), '40000000-0000-0000-0000-0000000000e1'::uuid,
  'anon resolves a valid share token to the correct snapshot'
);
select throws_ok(
  $sql$select public.get_snapshot_by_share_token('not-a-real-token')$sql$,
  'invalid share token',
  'anon resolving a bogus token is rejected'
);

-- Bob cannot create a link for Alice's snapshot (capability check fails
-- inside the security definer function before any INSERT is attempted).
select auth.set_test_session('40000000-0000-0000-0000-000000000002');
select throws_ok(
  $sql$select public.create_snapshot_share_link('40000000-0000-0000-0000-0000000000e1', null)$sql$,
  'insufficient capability: snapshot.share',
  'Bob cannot create a share link for Alice''s snapshot'
);
select is(
  (select count(*) from public.snapshot_share_links)::int, 0,
  'Bob sees zero of Alice''s share links'
);

-- Revocation: Alice revokes her link, then anon resolution fails.
select auth.set_test_session('40000000-0000-0000-0000-000000000001');
update public.snapshot_share_links set revoked_at = now(), revoked_by = auth.uid()
  where token_hash = encode(digest(:'alice_token', 'sha256'), 'hex');

select auth.set_test_session(null, 'anon');
select throws_ok(
  format($sql$select public.get_snapshot_by_share_token(%L)$sql$, :'alice_token'),
  'share link has been revoked',
  'anon resolving a revoked token is rejected'
);

-- Tamper guard: token_hash cannot be changed directly via UPDATE.
select auth.set_test_session('40000000-0000-0000-0000-000000000001');
select throws_ok(
  $sql$update public.snapshot_share_links set token_hash = 'tampered' where token_hash = encode(digest('nonexistent', 'sha256'), 'hex') or true$sql$,
  'snapshot_share_links: only revoked_at/revoked_by may change after creation',
  'directly changing token_hash via UPDATE is rejected'
);

-- Access events: exactly one recorded (the successful resolution above),
-- visible to Alice, invisible to Bob.
select is(
  (select count(*) from public.snapshot_access_events)::int, 1,
  'Alice sees exactly one recorded access event'
);

select auth.set_test_session('40000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.snapshot_access_events)::int, 0,
  'Bob sees zero access events for Alice''s link'
);

select * from finish();
rollback;
