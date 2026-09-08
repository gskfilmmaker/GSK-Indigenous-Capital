-- Test-only support, loaded before every numbered test file (pg_prove/
-- `supabase db test` run supabase/tests/*.sql in filename order). Defines
-- ONLY a session-switching helper — it does not stub auth.users,
-- auth.uid(), or the anon/authenticated/service_role roles, because a
-- real Supabase project (local `supabase start` stack or the deployed
-- one) already provides all of those genuinely. That stubbing instead
-- lives in scripts/dev/local-supabase-harness.sql, which is dev tooling
-- for environments with no Supabase stack at all (see that file's own
-- header) and must never be applied anywhere auth.uid() already exists.
--
-- set_test_session() itself is safe in both contexts: it only wraps the
-- same request.jwt.claim.* session settings PostgREST already uses to
-- drive auth.uid()/auth.role() on every real request, so it exercises
-- the exact mechanism RLS policies rely on rather than a test-only
-- shortcut around it.
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

begin;
select plan(1);
select has_function('auth', 'set_test_session', array['uuid', 'text'], 'auth.set_test_session() helper is installed for the tests that follow');
select * from finish();
rollback;
