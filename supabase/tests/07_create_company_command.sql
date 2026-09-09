-- create_company() (20260908150800_create_company_command.sql): the
-- first real command exercising invariant 5 in full (authorization via
-- RLS, idempotency, hash-chained audit, atomic outbox) end to end.
begin;
select plan(11);

insert into auth.users (id, email) values
  ('70000000-0000-0000-0000-000000000001', 'owner07@example.com'),
  ('70000000-0000-0000-0000-000000000002', 'viewer07@example.com'),
  ('70000000-0000-0000-0000-000000000003', 'outsider07@example.com');

select auth.set_test_session('70000000-0000-0000-0000-000000000001');
select public.create_organization('Command Test Co', 'command-test-co-07');
select id as org_id from public.organizations where slug = 'command-test-co-07' \gset

insert into public.organization_memberships (organization_id, user_id, role)
  values (:'org_id', '70000000-0000-0000-0000-000000000002', 'viewer');

-- Authorization: a viewer (no company.write) cannot create a company —
-- RLS on the companies insert, not this function, is what stops them.
select auth.set_test_session('70000000-0000-0000-0000-000000000002');
select throws_ok(
  format(
    $sql$select public.create_company(%L::uuid, public.uuidv7(), '{"legalName": "Should Not Exist Inc."}'::jsonb, 'viewer-attempt', 'reqhash-v', null, 'event-hash-v')$sql$,
    :'org_id'
  ),
  'new row violates row-level security policy for table "companies"',
  'a viewer without company.write cannot create a company'
);

-- A non-member cannot create a company for someone else's organization.
-- They fail even earlier than the viewer above: with no organization
-- membership at all, they cannot write the idempotency-key bookkeeping
-- row itself, before the function ever reaches the companies insert.
select auth.set_test_session('70000000-0000-0000-0000-000000000003');
select throws_ok(
  format(
    $sql$select public.create_company(%L::uuid, public.uuidv7(), '{"legalName": "Outsider Inc."}'::jsonb, 'outsider-attempt', 'reqhash-o', null, 'event-hash-o')$sql$,
    :'org_id'
  ),
  'new row violates row-level security policy for table "idempotency_keys"',
  'a non-member cannot create a company for another organization'
);

-- Successful creation by the owner, with a real field round-trip. The id
-- is generated the same way the real client will (public.uuidv7() here
-- stands in for packages/domain's newCompanyId(), same format) and
-- passed in explicitly, not left to the column default — see the
-- migration's own comment for why.
select auth.set_test_session('70000000-0000-0000-0000-000000000001');
select public.uuidv7() as new_company_id \gset
select (public.create_company(
  :'org_id'::uuid,
  :'new_company_id'::uuid,
  '{"legalName": "Real Startup Inc.", "operatingName": "Real Startup", "incorporationStatute": "OTHER", "incorporationStatuteOther": "Nova Scotia Companies Act", "defaultCurrency": "CAD", "hasReservedMatters": true, "registeredAddress": {"city": "Toronto", "country": "Canada"}}'::jsonb,
  'idem-key-owner-1',
  'reqhash-owner-1',
  null,
  'event-hash-owner-1'
)).id as company_id \gset

select is(
  :'company_id'::uuid, :'new_company_id'::uuid,
  'the company is created with the client-supplied id, not a server-generated one'
);
select is(
  (select legal_name from public.companies where id = :'company_id'), 'Real Startup Inc.',
  'legal_name round-trips correctly'
);
select is(
  (select incorporation_statute_other from public.companies where id = :'company_id'),
  'Nova Scotia Companies Act',
  'incorporation_statute_other round-trips correctly'
);
select is(
  (select has_reserved_matters from public.companies where id = :'company_id'), true,
  'has_reserved_matters round-trips correctly'
);
select is(
  (select registered_address ->> 'city' from public.companies where id = :'company_id'), 'Toronto',
  'registered_address (jsonb) round-trips correctly'
);

-- Idempotency: a retry with the same key and the same request hash
-- returns the original company, without creating a duplicate or a
-- second audit event. Note the retry passes a *different* freshly
-- generated id — the function must still return the original company,
-- proving the cached response wins, not whatever id this call supplied.
select public.uuidv7() as retry_attempted_id \gset
select (public.create_company(
  :'org_id'::uuid,
  :'retry_attempted_id'::uuid,
  '{"legalName": "Real Startup Inc.", "operatingName": "Real Startup", "incorporationStatute": "OTHER", "incorporationStatuteOther": "Nova Scotia Companies Act", "defaultCurrency": "CAD", "hasReservedMatters": true, "registeredAddress": {"city": "Toronto", "country": "Canada"}}'::jsonb,
  'idem-key-owner-1',
  'reqhash-owner-1',
  null,
  'event-hash-owner-1'
)).id as retried_company_id \gset
select is(
  :'retried_company_id'::uuid, :'company_id'::uuid,
  'retrying with the same idempotency key and request hash returns the original company, ignoring the retry''s id'
);
select is(
  (select count(*)::int from public.companies where organization_id = :'org_id'), 1,
  'the retry did not create a duplicate company'
);

-- A different request payload under the same idempotency key is
-- rejected outright rather than silently accepted as a fresh request.
select throws_ok(
  format(
    $sql$select public.create_company(%L::uuid, public.uuidv7(), '{"legalName": "A Totally Different Company"}'::jsonb, 'idem-key-owner-1', 'reqhash-DIFFERENT', null, 'event-hash-different')$sql$,
    :'org_id'
  ),
  'idempotency key reused with a different request payload',
  'reusing an idempotency key with a different request payload is rejected'
);

-- A key already marked in_progress (a genuine concurrent duplicate) is
-- rejected, not silently retried.
insert into public.idempotency_keys (organization_id, idempotency_key, request_hash, status)
  values (:'org_id', 'idem-key-inflight', 'reqhash-inflight', 'in_progress');
select throws_ok(
  format(
    $sql$select public.create_company(%L::uuid, public.uuidv7(), '{"legalName": "In Flight Inc."}'::jsonb, 'idem-key-inflight', 'reqhash-inflight', null, 'event-hash-inflight')$sql$,
    :'org_id'
  ),
  'a request with this idempotency key is already in progress',
  'a key already in_progress (a concurrent duplicate) is rejected'
);

select * from finish();
rollback;
