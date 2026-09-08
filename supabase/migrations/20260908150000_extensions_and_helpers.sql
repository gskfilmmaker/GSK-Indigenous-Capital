-- Extensions and shared helper functions used by every later migration.
-- See docs/adr/0002-id-format.md (UUIDv7) and root CLAUDE.md invariant 3
-- (append-only tables).

create extension if not exists pgcrypto;

-- Holds the security-definer authorization functions (docs/adr/0003), kept
-- separate from `public` so capability checks are never confused with
-- application tables.
create schema if not exists authz;

-- UUIDv7 (RFC 9562): a 48-bit big-endian millisecond Unix timestamp in the
-- first 6 bytes, followed by 10 random bytes with the version (7) and
-- variant (RFC 4122, "10") nibbles set. Defined here rather than assumed
-- built-in, since not every Postgres version ships one (docs/adr/0002).
create or replace function public.uuidv7()
returns uuid
language plpgsql
volatile
as $$
declare
  unix_ts_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  buf bytea := gen_random_bytes(16);
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

comment on function public.uuidv7() is
  'RFC 9562 UUIDv7 generator (docs/adr/0002-id-format.md). Used as the default for every primary key.';

-- Generic updated_at maintenance trigger for ordinary mutable tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Generic append-only guard (root CLAUDE.md invariant 3): attach as a
-- BEFORE UPDATE OR DELETE trigger on any table whose rows must never be
-- edited or removed once inserted. This is defense in depth alongside the
-- RLS policies, which grant INSERT/SELECT only for these tables — see
-- docs/adr/0003-supabase-rls-strategy.md point 6.
create or replace function public.reject_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'rows in % are append-only: corrections are reversal/superseding records, never edits or deletes', TG_TABLE_NAME
    using errcode = '0A000'; -- feature_not_supported
end;
$$;
