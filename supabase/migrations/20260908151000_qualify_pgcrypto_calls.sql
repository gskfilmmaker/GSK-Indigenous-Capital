-- Fixes a real production bug found during the first live onboarding
-- test: `create_organization()` failed with
-- "function gen_random_bytes(integer) does not exist".
--
-- Root cause: on Supabase's hosted platform, `pgcrypto` is installed into
-- the `extensions` schema, not `public` (unlike a bare `create extension
-- pgcrypto;` on a local/self-managed Postgres, which installs into
-- `public` by default — this is exactly why this was invisible against
-- this project's own local pgTAP harness until now; see the harness fix
-- accompanying this migration in the same commit, which reproduces the
-- real layout so this bug class is caught locally from now on).
--
-- Every `security definer`/`security invoker` function in this schema
-- that mutates data sets `set search_path = public, pg_temp` (ADR 0003;
-- deliberate, to close a search-path-injection surface for privileged
-- functions) — and that explicit search_path is what's missing
-- `extensions`, so any *unqualified* pgcrypto call made while running
-- under it fails to resolve. This affects two categories:
--
-- 1. `public.uuidv7()`, called with no schema-qualification of its own
--    `gen_random_bytes(16)` call. It has no `set search_path` of its own
--    (plain `security invoker`, the Postgres default), so it always
--    inherits whichever search_path was active in its caller at the
--    moment it runs. Every table in this project defaults its `id`
--    column to `public.uuidv7()` — so *any* insert made from inside a
--    `set search_path = public, pg_temp` function (create_organization,
--    create_company, save_scenario, create_snapshot_share_link, ...)
--    was broken, not just organization creation specifically.
-- 2. `public.create_snapshot_share_link()` and
--    `public.get_snapshot_by_share_token()`, which call
--    `gen_random_bytes(32)` and `digest(...)` directly.
--
-- Fix: schema-qualify every pgcrypto call as `extensions.<fn>`, in all
-- three functions, via `create or replace function` (preserves the
-- existing grants — this is not a new function, no re-grant needed).
create or replace function public.uuidv7()
returns uuid
language plpgsql
volatile
as $$
declare
  unix_ts_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  buf bytea := extensions.gen_random_bytes(16);
begin
  buf := set_byte(buf, 0, ((unix_ts_ms >> 40) & 255)::int);
  buf := set_byte(buf, 1, ((unix_ts_ms >> 32) & 255)::int);
  buf := set_byte(buf, 2, ((unix_ts_ms >> 24) & 255)::int);
  buf := set_byte(buf, 3, ((unix_ts_ms >> 16) & 255)::int);
  buf := set_byte(buf, 4, ((unix_ts_ms >> 8) & 255)::int);
  buf := set_byte(buf, 5, (unix_ts_ms & 255)::int);
  buf := set_byte(buf, 6, ((get_byte(buf, 6) & 15) | 112)); -- version nibble = 0111
  buf := set_byte(buf, 8, ((get_byte(buf, 8) & 63) | 128)); -- variant bits = 10
  return encode(buf, 'hex')::uuid;
end;
$$;

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

  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.snapshot_share_links (scenario_snapshot_id, token_hash, expires_at, created_by)
  values (p_snapshot_id, encode(extensions.digest(v_raw_token, 'sha256'), 'hex'), p_expires_at, auth.uid())
  returning snapshot_share_links.id into v_link_id;

  return query select v_link_id, v_raw_token, p_expires_at;
end;
$$;

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
  where token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex');

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
