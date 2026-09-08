-- Private snapshot share links (spec §9.5, §14, route `/s/:shareToken`,
-- `GET /s/:rawToken` — immutable read-only snapshot).
--
-- Design: the raw token is never stored, only sha256(raw_token) — the same
-- reasoning as a password hash: anyone who can read snapshot_share_links
-- (an org member with snapshot.share, or a future DB compromise) still
-- cannot use a token_hash to view the snapshot, only the raw token itself
-- can. Because of that, resolving a raw token into a snapshot cannot be
-- expressed as an ordinary RLS-guarded SELECT (there is no session claim
-- to match against — the token _is_ the credential); it goes through
-- public.get_snapshot_by_share_token() below instead, callable by anon.
-- Link creation is the same shape as create_organization() in
-- 20260908150200: security definer, because generating+hashing the token
-- and inserting it must happen atomically and the raw token must never
-- round-trip through a value the caller could otherwise supply (a plain
-- INSERT policy would let a caller choose their own token_hash for a
-- token they don't actually hold).

create table public.snapshot_share_links (
  id uuid primary key default public.uuidv7(),
  scenario_snapshot_id uuid not null references public.scenario_snapshots (id) on delete cascade,
  token_hash text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  constraint snapshot_share_links_revocation_consistency check (
    (revoked_at is null and revoked_by is null) or (revoked_at is not null and revoked_by is not null)
  )
);

comment on table public.snapshot_share_links is 'Private, revocable, expirable links to one immutable scenario_snapshot (spec §9.5). Only token_hash is stored — the raw token is returned once, at creation, by create_snapshot_share_link() and never persisted.';

create index snapshot_share_links_scenario_snapshot_id_idx on public.snapshot_share_links (scenario_snapshot_id);

-- Snapshot-scoped capability check, joining through scenario_snapshots ->
-- scenarios -> companies to the same authz.has_capability() every other
-- table uses. Shared by this migration's two tables.
create or replace function authz.has_capability_for_snapshot(p_snapshot_id uuid, p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.scenario_snapshots s
    join public.scenarios sc on sc.id = s.scenario_id
    where s.id = p_snapshot_id
      and authz.has_capability_for_company(sc.company_id, p_capability)
  );
$$;

revoke all on function authz.has_capability_for_snapshot(uuid, text) from public;
grant execute on function authz.has_capability_for_snapshot(uuid, text) to authenticated;

alter table public.snapshot_share_links enable row level security;
alter table public.snapshot_share_links force row level security;

create policy snapshot_share_links_select_with_capability on public.snapshot_share_links
  for select
  to authenticated
  using (authz.has_capability_for_snapshot(scenario_snapshot_id, 'snapshot.share'));

-- Only revocation may happen through ordinary UPDATE (revokeShareLink);
-- creation is RPC-only (see create_snapshot_share_link() below) and
-- extending/shortening expiry has no corresponding command, so it isn't
-- allowed either — reject_share_link_core_field_changes() enforces that
-- below as a trigger, since RLS's `with check` alone cannot compare
-- against the pre-update row.
create policy snapshot_share_links_update_with_capability on public.snapshot_share_links
  for update
  to authenticated
  using (authz.has_capability_for_snapshot(scenario_snapshot_id, 'snapshot.share'))
  with check (authz.has_capability_for_snapshot(scenario_snapshot_id, 'snapshot.share'));

-- No INSERT policy/grant (RPC-only, see above) and no DELETE (revocation
-- is a superseding state, not removal — matches root CLAUDE.md invariant
-- 4). service_role keeps a plain INSERT grant since get_snapshot_by_share_
-- token() and create_snapshot_share_link() both run as security definer,
-- not as service_role, so this grant is for administrative/backend tooling
-- only, not a route any application code is expected to take.
grant select, update on public.snapshot_share_links to authenticated;
grant select, insert, update on public.snapshot_share_links to service_role;

create or replace function public.reject_share_link_core_field_changes()
returns trigger
language plpgsql
as $$
begin
  if new.scenario_snapshot_id <> old.scenario_snapshot_id
    or new.token_hash <> old.token_hash
    or new.created_by is distinct from old.created_by
    or new.created_at <> old.created_at
    or new.expires_at is distinct from old.expires_at
  then
    raise exception 'snapshot_share_links: only revoked_at/revoked_by may change after creation'
      using errcode = '0A000';
  end if;
  return new;
end;
$$;

create trigger snapshot_share_links_reject_core_field_changes
  before update on public.snapshot_share_links
  for each row
  execute function public.reject_share_link_core_field_changes();

-- Append-only view log (spec's "share link viewed" notification, §18).
-- Deliberately does not record IP address or user agent: root CLAUDE.md
-- invariant 6 prohibits logging PII, and an anonymous link viewer's IP is
-- exactly that. "Viewed" here means only "this link was resolved,
-- at this time" — sufficient for a view count/last-viewed display without
-- collecting anything about who viewed it.
create table public.snapshot_access_events (
  id uuid primary key default public.uuidv7(),
  snapshot_share_link_id uuid not null references public.snapshot_share_links (id) on delete cascade,
  accessed_at timestamptz not null default now()
);

comment on table public.snapshot_access_events is 'Append-only "link was viewed" log (spec §9.5, §18). No IP/user-agent by design — see root CLAUDE.md invariant 6.';

create index snapshot_access_events_share_link_id_idx on public.snapshot_access_events (snapshot_share_link_id);

alter table public.snapshot_access_events enable row level security;
alter table public.snapshot_access_events force row level security;

create policy snapshot_access_events_select_with_capability on public.snapshot_access_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.snapshot_share_links l
      where l.id = snapshot_share_link_id
        and authz.has_capability_for_snapshot(l.scenario_snapshot_id, 'snapshot.share')
    )
  );

-- No INSERT policy/grant for authenticated or anon: rows are written only
-- by get_snapshot_by_share_token() (security definer, below).
grant select on public.snapshot_access_events to authenticated;
grant select, insert on public.snapshot_access_events to service_role;

create trigger snapshot_access_events_append_only
  before update or delete on public.snapshot_access_events
  for each row
  execute function public.reject_update_delete();

-- Bootstrap RPC: the only way to create a share link. Generates a random
-- 256-bit token, stores only its hash, and returns the raw token exactly
-- once — it cannot be recovered later. security definer so it can insert
-- despite no INSERT policy existing on the table (same reasoning as
-- create_organization() in 20260908150200).
create or replace function public.create_snapshot_share_link(p_snapshot_id uuid, p_expires_at timestamptz default null)
returns table (id uuid, raw_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_raw_token text;
  v_link_id uuid;
begin
  if auth.uid() is null then
    raise exception 'create_snapshot_share_link requires an authenticated user' using errcode = '28000';
  end if;

  if not authz.has_capability_for_snapshot(p_snapshot_id, 'snapshot.share') then
    raise exception 'insufficient capability: snapshot.share' using errcode = '42501';
  end if;

  v_raw_token := encode(gen_random_bytes(32), 'hex');

  insert into public.snapshot_share_links (scenario_snapshot_id, token_hash, expires_at, created_by)
  values (p_snapshot_id, encode(digest(v_raw_token, 'sha256'), 'hex'), p_expires_at, auth.uid())
  returning snapshot_share_links.id into v_link_id;

  return query select v_link_id, v_raw_token, p_expires_at;
end;
$$;

revoke all on function public.create_snapshot_share_link(uuid, timestamptz) from public;
grant execute on function public.create_snapshot_share_link(uuid, timestamptz) to authenticated;

comment on function public.create_snapshot_share_link(uuid, timestamptz) is
  'Creates a share link for a scenario_snapshot and returns its raw token once. The raw token is never stored — only its sha256 hash is.';

-- Bootstrap RPC: the only way to resolve a raw token into its snapshot.
-- security definer so it can read snapshot_share_links/scenario_snapshots
-- and write snapshot_access_events despite anon having no direct grant on
-- any of them — the raw token itself is the only credential involved.
create or replace function public.get_snapshot_by_share_token(p_raw_token text)
returns public.scenario_snapshots
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.snapshot_share_links;
  v_snapshot public.scenario_snapshots;
begin
  select * into v_link
  from public.snapshot_share_links
  where token_hash = encode(digest(p_raw_token, 'sha256'), 'hex');

  if not found then
    raise exception 'invalid share token' using errcode = '28000';
  end if;

  if v_link.revoked_at is not null then
    raise exception 'share link has been revoked' using errcode = '28000';
  end if;

  if v_link.expires_at is not null and v_link.expires_at <= now() then
    raise exception 'share link has expired' using errcode = '28000';
  end if;

  insert into public.snapshot_access_events (snapshot_share_link_id) values (v_link.id);

  select * into v_snapshot from public.scenario_snapshots where id = v_link.scenario_snapshot_id;

  return v_snapshot;
end;
$$;

revoke all on function public.get_snapshot_by_share_token(text) from public;
grant execute on function public.get_snapshot_by_share_token(text) to anon, authenticated;

comment on function public.get_snapshot_by_share_token(text) is
  'Resolves a raw share token to its immutable scenario_snapshot, rejecting revoked/expired links, and records one snapshot_access_events row. Callable by anon — this is the only supported way to serve GET /s/:rawToken.';
