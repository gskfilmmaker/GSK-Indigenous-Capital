-- Cross-tenant RLS tests for organizations + organization_memberships
-- (spec §21 Phase 1 / §25 item 6: pgTAP proof that org A cannot read or
-- write org B's rows, for every table).
begin;
select plan(11);

-- Fixtures: two users, each creating their own organization via the
-- create_organization() bootstrap RPC (the only supported creation path).
insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'alice@example.com'),
  ('10000000-0000-0000-0000-000000000002', 'bob@example.com');

select auth.set_test_session('10000000-0000-0000-0000-000000000001');
select public.create_organization('Alice Co', 'alice-co-01');

select auth.set_test_session('10000000-0000-0000-0000-000000000002');
select public.create_organization('Bob Co', 'bob-co-01');

-- Each owner can see exactly their own organization and membership.
select auth.set_test_session('10000000-0000-0000-0000-000000000001');
select is(
  (select count(*) from public.organizations)::int, 1,
  'Alice sees exactly one organization (her own)'
);
select is(
  (select slug from public.organizations limit 1), 'alice-co-01',
  'the organization Alice sees is alice-co-01'
);
select is(
  (select count(*) from public.organization_memberships)::int, 1,
  'Alice sees exactly one membership (her own)'
);

select auth.set_test_session('10000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.organizations)::int, 1,
  'Bob sees exactly one organization (his own), not Alice''s'
);
select is(
  (select slug from public.organizations limit 1), 'bob-co-01',
  'the organization Bob sees is bob-co-01'
);

-- Bob cannot rename Alice's organization: the UPDATE affects zero rows
-- (RLS silently filters it out of Bob's writable set, rather than
-- erroring) and Alice's data is unchanged.
update public.organizations set name = 'Hijacked' where slug = 'alice-co-01';
select is(
  (select count(*) from public.organizations where name = 'Hijacked')::int, 0,
  'Bob''s attempted rename of Alice''s organization affects zero rows'
);

select auth.set_test_session('10000000-0000-0000-0000-000000000001');
select is(
  (select name from public.organizations where slug = 'alice-co-01'), 'Alice Co',
  'Alice Co''s name is unchanged after Bob''s attempted rename'
);

-- Bob cannot invite himself into Alice's organization by directly
-- inserting a membership row.
select auth.set_test_session('10000000-0000-0000-0000-000000000002');
select throws_ok(
  format(
    $sql$insert into public.organization_memberships (organization_id, user_id, role)
      values ((select id from public.organizations where slug = 'alice-co-01' limit 1), %L, 'owner')$sql$,
    '10000000-0000-0000-0000-000000000002'
  ),
  'new row violates row-level security policy for table "organization_memberships"',
  'Bob cannot insert a membership row into Alice''s organization'
);

-- anon has no access to organizations at all (denied at the permission
-- layer, stricter than an RLS-filtered empty result).
select auth.set_test_session(null, 'anon');
select throws_ok(
  'select count(*) from public.organizations',
  'permission denied for table organizations',
  'anon has no grant on organizations at all'
);

-- No INSERT policy exists on organizations for authenticated users — the
-- only creation path is create_organization().
select auth.set_test_session('10000000-0000-0000-0000-000000000001');
select throws_ok(
  $sql$insert into public.organizations (name, slug) values ('Direct Insert Co', 'direct-insert-co')$sql$,
  'permission denied for table organizations',
  'a direct INSERT into organizations is rejected — no INSERT grant exists; create_organization() is the only path'
);

-- create_organization() is granted to authenticated only — anon cannot
-- even reach the function's own "authenticated user required" check.
select auth.set_test_session(null, 'anon');
select throws_ok(
  $sql$select public.create_organization('Anon Co', 'anon-co')$sql$,
  'permission denied for function create_organization',
  'anon has no EXECUTE grant on create_organization() at all'
);

select * from finish();
rollback;
