-- Fixes a gap found while building the first real command (company
-- creation, spec §9.2/§14): to append a correctly hash-chained
-- audit_events row (ADR 0006), the caller must first read
-- prev_event_hash — the previous event's event_hash for that
-- organization — since the database only verifies the chain, it never
-- computes event_hash itself (root CLAUDE.md invariant 3; ADR 0006).
--
-- But `audit_events_select_with_capability`
-- (20260908150600_audit_outbox_idempotency.sql) gates SELECT on the
-- organization's own `audit.read` capability, and per
-- 20260908150100_authz_capabilities.sql's seeded role_capabilities the
-- `editor` role does not hold `audit.read` (only owner/admin/viewer do).
-- An editor performing an ordinary authorized mutation — e.g. creating a
-- company, which their role's `company.write` capability explicitly
-- allows — would then have no way to read the chain tip and could never
-- append a valid audit event for their own action, silently breaking
-- invariant 5 for that role.
--
-- This function narrowly closes that gap: it exposes only the single
-- opaque hash string needed to continue the chain (never the event's
-- action/resource/payload), gated on organization membership alone
-- rather than the broader `audit.read` capability that governs actually
-- reading the audit log. `audit.read` keeps its original meaning
-- (visibility into the organization's audit history); this function is
-- narrower on purpose.
create or replace function public.get_last_audit_event_hash(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.event_hash
  from public.audit_events e
  where e.organization_id = p_organization_id
    and exists (
      select 1
      from public.organization_memberships m
      where m.organization_id = p_organization_id
        and m.user_id = auth.uid()
    )
  order by e.sequence desc
  limit 1;
$$;

revoke all on function public.get_last_audit_event_hash(uuid) from public;
grant execute on function public.get_last_audit_event_hash(uuid) to authenticated;

comment on function public.get_last_audit_event_hash(uuid) is
  'Returns the event_hash of the most recent audit_events row for an organization (or null if the chain is empty), for any member of that organization — narrower than audit.read, which gates reading the audit log itself. Lets a command layer compute the next row''s prev_event_hash without granting broad audit-log visibility to every role that can write one (ADR 0006).';
