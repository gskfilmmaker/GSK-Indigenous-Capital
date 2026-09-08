-- Local test-only harness that approximates the parts of a real Supabase
-- Postgres project our migrations and pgTAP tests depend on: the anon /
-- authenticated / service_role roles, and an `auth.uid()` that reads the
-- same session-local setting PostgREST populates from the request JWT.
-- This file is dev/test tooling only — it is never applied to the real
-- Supabase project (which already provides all of this natively).
create extension if not exists pgcrypto;
create extension if not exists pgtap;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant anon to postgres;
grant authenticated to postgres;
grant service_role to postgres;

create schema if not exists auth;

-- Real Supabase projects grant USAGE on schema auth (and EXECUTE on
-- auth.uid()/auth.role()) to anon/authenticated by default, since RLS
-- policies and application code both call auth.uid() directly as those
-- roles, not only from within security definer functions. Match that here.
grant usage on schema auth to anon, authenticated;

-- Real Supabase projects provide auth.users (owned by GoTrue/Auth); our
-- migrations never create or modify it. This minimal stand-in exists only
-- so local FK constraints and test fixtures have something to reference.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

create or replace function auth.uid() returns uuid
  language sql stable
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

create or replace function auth.role() returns text
  language sql stable
  as $$
    select nullif(current_setting('request.jwt.claim.role', true), '')
  $$;

grant execute on function auth.uid() to anon, authenticated;
grant execute on function auth.role() to anon, authenticated;

-- Test helper: run the rest of a psql session "as" a given user/role,
-- the same way PostgREST sets these per-request from the JWT.
create or replace function auth.set_test_session(user_id uuid, role_name text default 'authenticated')
  returns void
  language plpgsql
  as $$
  begin
    execute format('set local role %I', role_name);
    perform set_config('request.jwt.claim.sub', user_id::text, true);
    perform set_config('request.jwt.claim.role', role_name, true);
  end;
  $$;
