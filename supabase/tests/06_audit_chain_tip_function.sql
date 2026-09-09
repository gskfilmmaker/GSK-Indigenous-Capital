-- get_last_audit_event_hash() (20260908150700_audit_chain_tip_function.sql):
-- an editor (who lacks audit.read, per 20260908150100's seeded
-- role_capabilities) must still be able to read the chain tip to append
-- a correctly hash-chained audit event for their own authorized action.
begin;
select plan(6);

insert into auth.users (id, email) values
  ('60000000-0000-0000-0000-000000000001', 'owner06@example.com'),
  ('60000000-0000-0000-0000-000000000002', 'editor06@example.com'),
  ('60000000-0000-0000-0000-000000000003', 'outsider06@example.com');

select auth.set_test_session('60000000-0000-0000-0000-000000000001');
select public.create_organization('Chain Tip Co', 'chain-tip-co-06');
select id as org_id from public.organizations where slug = 'chain-tip-co-06' \gset

-- Add editor06 as an editor of the same organization (editor lacks
-- audit.read — this is the exact gap the function closes).
insert into public.organization_memberships (organization_id, user_id, role)
  values (:'org_id', '60000000-0000-0000-0000-000000000002', 'editor');

-- Empty chain: null, not an error.
select is(
  public.get_last_audit_event_hash(:'org_id'), null,
  'an organization with no audit events yet returns null, not an error'
);

-- Owner inserts the genesis event directly (as in 05's test) so there is
-- a real tip to read.
insert into public.audit_events (organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id)
  values (:'org_id', null, 'tip-hash-1', auth.uid(), 'company.created', 'company', '60000000-0000-0000-0000-00000000c001');

select is(
  public.get_last_audit_event_hash(:'org_id'), 'tip-hash-1',
  'the owner (who holds audit.read) reads the correct chain tip'
);

-- The editor — who has company.write but NOT audit.read — can still
-- read the tip via this function, and can then successfully append a
-- correctly chained event for their own authorized action.
select auth.set_test_session('60000000-0000-0000-0000-000000000002');
select is(
  public.get_last_audit_event_hash(:'org_id'), 'tip-hash-1',
  'an editor without audit.read still reads the correct chain tip'
);
select is(
  (select count(*) from public.audit_events)::int, 0,
  'confirms the editor genuinely lacks audit.read: RLS filters a direct SELECT on audit_events to zero rows'
);
select lives_ok(
  format(
    $sql$insert into public.audit_events (organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id)
      values (%L, 'tip-hash-1', 'tip-hash-2', auth.uid(), 'company.created', 'company', '60000000-0000-0000-0000-00000000c002')$sql$,
    :'org_id'
  ),
  'the editor appends a correctly chained event using the tip this function returned'
);

-- An outsider (not a member of this organization) never learns the tip.
select auth.set_test_session('60000000-0000-0000-0000-000000000003');
select is(
  public.get_last_audit_event_hash(:'org_id'), null,
  'a non-member reads null, never the real tip, for an organization they do not belong to'
);

select * from finish();
rollback;
