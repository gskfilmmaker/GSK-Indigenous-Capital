-- Organizations and their memberships (spec §9.1). Every later tenant
-- table is scoped to organizations either directly (organization_id) or
-- transitively through a parent row that is.

create table public.organizations (
  id uuid primary key default public.uuidv7(),
  name text not null check (char_length(name) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index organizations_slug_key on public.organizations (slug);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row
  execute function public.set_updated_at();

create table public.organization_memberships (
  id uuid primary key default public.uuidv7(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_memberships_user_id_idx on public.organization_memberships (user_id);

create trigger organization_memberships_set_updated_at
  before update on public.organization_memberships
  for each row
  execute function public.set_updated_at();

-- Capability check (spec §4.2, docs/adr/0003-supabase-rls-strategy.md):
-- every RLS policy in this project calls this instead of re-implementing
-- a role check inline. `security definer` + fixed `search_path` per the
-- ADR; `stable` since it only reads within the current statement.
create or replace function authz.has_capability(p_organization_id uuid, p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.role_capabilities rc on rc.role = m.role
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and rc.capability = p_capability
  );
$$;

revoke all on function authz.has_capability(uuid, text) from public;
grant execute on function authz.has_capability(uuid, text) to authenticated;

comment on function authz.has_capability(uuid, text) is
  'True iff the calling user (auth.uid()) has a membership in the given organization whose role grants the given capability (spec §4.2).';

alter table public.organizations enable row level security;
alter table public.organizations force row level security;

create policy organizations_select_with_capability on public.organizations
  for select
  to authenticated
  using (authz.has_capability(id, 'org.read'));

create policy organizations_update_with_capability on public.organizations
  for update
  to authenticated
  using (authz.has_capability(id, 'org.manage'))
  with check (authz.has_capability(id, 'org.manage'));

-- No direct INSERT/DELETE policy: organizations are created only via the
-- create_organization() function below (security definer, atomically
-- creates the org and its first owner membership — a plain INSERT policy
-- can't express "and also become owner" atomically without a moment where
-- the org exists with no owner). Deletion is not supported in Step 4.
--
-- RLS policies only filter rows a role can already reach — the underlying
-- SQL privilege via GRANT is also required, or every query is denied at
-- the permission layer before RLS is ever evaluated (see
-- 20260908150100_authz_capabilities.sql). No INSERT/DELETE grant: rows are
-- only ever created via create_organization() (security definer, runs as
-- the function owner) and never deleted in Step 4.
grant select, update on public.organizations to authenticated, service_role;

alter table public.organization_memberships enable row level security;
alter table public.organization_memberships force row level security;

create policy organization_memberships_select_with_capability on public.organization_memberships
  for select
  to authenticated
  using (authz.has_capability(organization_id, 'org.read'));

create policy organization_memberships_insert_with_capability on public.organization_memberships
  for insert
  to authenticated
  with check (authz.has_capability(organization_id, 'member.invite'));

create policy organization_memberships_update_with_capability on public.organization_memberships
  for update
  to authenticated
  using (authz.has_capability(organization_id, 'member.role.change'))
  with check (authz.has_capability(organization_id, 'member.role.change'));

create policy organization_memberships_delete_with_capability on public.organization_memberships
  for delete
  to authenticated
  using (authz.has_capability(organization_id, 'member.role.change'));

grant select, insert, update, delete on public.organization_memberships to authenticated, service_role;

-- Bootstrap RPC: the only way to create an organization. Atomically
-- inserts the organization and the calling user's owner membership, so
-- there is never a moment where an organization exists without an owner
-- (and thus never a moment RLS would need to allow an orphaned insert).
create or replace function public.create_organization(p_name text, p_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'create_organization requires an authenticated user' using errcode = '28000';
  end if;

  insert into public.organizations (name, slug)
  values (p_name, p_slug)
  returning * into v_org;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (v_org.id, auth.uid(), 'owner');

  return v_org;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;

comment on function public.create_organization(text, text) is
  'Creates an organization and makes the calling user its owner, atomically. The only supported way to create an organization.';
