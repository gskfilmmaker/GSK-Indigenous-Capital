-- Cross-tenant RLS tests for companies (spec §21 Phase 1 / §25 item 6).
begin;
select plan(7);

insert into auth.users (id, email) values
  ('20000000-0000-0000-0000-000000000001', 'alice@example.com'),
  ('20000000-0000-0000-0000-000000000002', 'bob@example.com');

select auth.set_test_session('20000000-0000-0000-0000-000000000001');
select public.create_organization('Alice Co', 'alice-co-02');
select auth.set_test_session('20000000-0000-0000-0000-000000000002');
select public.create_organization('Bob Co', 'bob-co-02');

select auth.set_test_session('20000000-0000-0000-0000-000000000001');
insert into public.companies (organization_id, legal_name, incorporation_statute)
  values ((select id from public.organizations where slug = 'alice-co-02'), 'Alice Startup Inc.', 'CBCA');

select is(
  (select count(*) from public.companies)::int, 1,
  'Alice sees exactly one company (her own)'
);

select auth.set_test_session('20000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.companies)::int, 0,
  'Bob sees zero companies (Alice''s is invisible to him)'
);

select throws_ok(
  format(
    $sql$insert into public.companies (organization_id, legal_name)
      values ((select id from public.organizations where slug = 'alice-co-02'), 'Hijack Inc.')$sql$
  ),
  'new row violates row-level security policy for table "companies"',
  'Bob cannot insert a company into Alice''s organization'
);

-- No delete policy: even the owning organization's member cannot delete a
-- company row (permanent issuer record once created).
select auth.set_test_session('20000000-0000-0000-0000-000000000001');
select throws_ok(
  $sql$delete from public.companies where legal_name = 'Alice Startup Inc.'$sql$,
  'permission denied for table companies',
  'deleting a company is rejected — no DELETE grant exists'
);

-- Statute/other consistency check constraint.
select throws_ok(
  format(
    $sql$insert into public.companies (organization_id, legal_name, incorporation_statute)
      values ((select id from public.organizations where slug = 'alice-co-02'), 'Bad Statute Co', 'OTHER')$sql$
  ),
  'new row for relation "companies" violates check constraint "companies_statute_other_consistency"',
  'OTHER without incorporation_statute_other is rejected'
);

select lives_ok(
  format(
    $sql$insert into public.companies (organization_id, legal_name, incorporation_statute, incorporation_statute_other)
      values ((select id from public.organizations where slug = 'alice-co-02'), 'Good Statute Co', 'OTHER', 'Nova Scotia Act')$sql$
  ),
  'OTHER with incorporation_statute_other set is accepted'
);

select is(
  (select count(*) from public.companies)::int, 2,
  'Alice now sees two companies of her own'
);

select * from finish();
rollback;
