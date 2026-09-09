-- The first real "command" (root CLAUDE.md invariant 5: every mutation
-- needs authorization, validation, idempotency, audit, and an atomic
-- outbox event) — company creation during onboarding (spec §6.2, §9.2).
--
-- Design: a single `security invoker` PL/pgSQL function, not a plain
-- client-side insert. Running as the calling user (not security definer)
-- means every internal statement is still subject to the exact same RLS
-- policies and GRANTs as if the client had issued them directly —
-- `companies_insert_with_capability` still requires `company.write`,
-- and the idempotency/audit/outbox inserts still require organization
-- membership — so this adds nothing to what the caller could already do
-- via separate calls (root CLAUDE.md invariant 1 is untouched). What a
-- single function gives is atomicity: idempotency bookkeeping, the
-- domain row, the audit event, and the outbox event either all commit
-- together or none do, which four separate supabase-js calls cannot
-- guarantee.
--
-- Idempotency (spec §14): claims (organization_id, idempotency_key) via
-- `on conflict do nothing`. A retry with a `completed` key and the same
-- request_hash returns the original company unchanged (never re-inserts
-- or duplicates); a different request_hash under the same key is
-- rejected outright (a client bug, not a legitimate retry); a still-
-- `in_progress` key is a genuine concurrent duplicate, rejected for the
-- caller to retry; a `failed` key is reset and the mutation retried.
--
-- Audit (ADR 0006): `p_prev_event_hash`/`p_event_hash` are computed by
-- the caller via @gsk/audit's canonicalHash() — this function only
-- inserts them and lets `audit_events_assign_and_verify_chain` verify
-- the chain, exactly as every other audit_events write in this project
-- does. The caller reads the chain tip first via
-- `get_last_audit_event_hash()` (20260908150700).
--
-- `p_company_id` is generated client-side (UUIDv7, matching
-- `public.uuidv7()`'s own format — see packages/domain's newCompanyId(),
-- the same pattern already used for scenario/safe ids) and inserted
-- explicitly rather than left to the `companies.id` column default: the
-- audit event's hash must cover the resource it describes, which means
-- the company's id has to be known *before* this function runs, not
-- read back only after the insert.
--
-- Known, documented gap: `create_organization()` (20260908150200) is not
-- retrofitted with idempotency/audit/outbox here. Idempotency doesn't fit
-- it structurally — `idempotency_keys.organization_id` is `not null`,
-- but organization creation has no organization to scope a key to until
-- it succeeds — and it is already applied to the real project and
-- exercised in production, so changing it carries more risk than adding
-- this new, additive function. Audit/outbox coverage for organization
-- creation itself is deferred to a future hardening pass, not silently
-- dropped.
create or replace function public.create_company(
  p_organization_id uuid,
  p_company_id uuid,
  p_company jsonb,
  p_idempotency_key text,
  p_request_hash text,
  p_prev_event_hash text,
  p_event_hash text
)
returns public.companies
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_company public.companies;
  v_idem public.idempotency_keys;
begin
  if auth.uid() is null then
    raise exception 'create_company requires an authenticated user' using errcode = '28000';
  end if;

  insert into public.idempotency_keys (organization_id, idempotency_key, request_hash, status)
  values (p_organization_id, p_idempotency_key, p_request_hash, 'in_progress')
  on conflict (organization_id, idempotency_key) do nothing
  returning * into v_idem;

  if not found then
    select * into v_idem
    from public.idempotency_keys
    where organization_id = p_organization_id and idempotency_key = p_idempotency_key;

    if v_idem.status = 'completed' then
      if v_idem.request_hash <> p_request_hash then
        raise exception 'idempotency key reused with a different request payload' using errcode = '23514';
      end if;
      select * into v_company from public.companies where id = (v_idem.response ->> 'companyId')::uuid;
      return v_company;
    elsif v_idem.status = 'in_progress' then
      raise exception 'a request with this idempotency key is already in progress' using errcode = '55P03';
    else
      update public.idempotency_keys
        set status = 'in_progress', request_hash = p_request_hash
        where organization_id = p_organization_id and idempotency_key = p_idempotency_key;
    end if;
  end if;

  insert into public.companies (
    id, organization_id, legal_name, operating_name, incorporation_statute, incorporation_statute_other,
    corporation_number, incorporation_date, registered_address, head_office_address, default_currency,
    has_shareholder_agreement, has_unanimous_shareholder_agreement, has_investor_rights_agreement,
    has_debt_covenant, has_reserved_matters
  ) values (
    p_company_id,
    p_organization_id,
    p_company ->> 'legalName',
    p_company ->> 'operatingName',
    coalesce((p_company ->> 'incorporationStatute')::public.incorporation_statute, 'UNKNOWN'),
    p_company ->> 'incorporationStatuteOther',
    p_company ->> 'corporationNumber',
    (p_company ->> 'incorporationDate')::date,
    p_company -> 'registeredAddress',
    p_company -> 'headOfficeAddress',
    coalesce(p_company ->> 'defaultCurrency', 'CAD'),
    coalesce((p_company ->> 'hasShareholderAgreement')::boolean, false),
    coalesce((p_company ->> 'hasUnanimousShareholderAgreement')::boolean, false),
    coalesce((p_company ->> 'hasInvestorRightsAgreement')::boolean, false),
    coalesce((p_company ->> 'hasDebtCovenant')::boolean, false),
    coalesce((p_company ->> 'hasReservedMatters')::boolean, false)
  )
  returning * into v_company;

  insert into public.audit_events (
    organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id, payload
  ) values (
    p_organization_id, p_prev_event_hash, p_event_hash, auth.uid(), 'company.created', 'company', v_company.id,
    jsonb_build_object('companyId', v_company.id)
  );

  insert into public.outbox_events (organization_id, aggregate_type, aggregate_id, event_type, payload)
  values (p_organization_id, 'company', v_company.id, 'company.created', jsonb_build_object('companyId', v_company.id));

  update public.idempotency_keys
    set status = 'completed', response = jsonb_build_object('companyId', v_company.id), completed_at = now()
    where organization_id = p_organization_id and idempotency_key = p_idempotency_key;

  return v_company;
end;
$$;

revoke all on function public.create_company(uuid, uuid, jsonb, text, text, text, text) from public;
grant execute on function public.create_company(uuid, uuid, jsonb, text, text, text, text) to authenticated;

comment on function public.create_company(uuid, uuid, jsonb, text, text, text, text) is
  'Creates a company for an organization, atomically alongside its idempotency-key bookkeeping, hash-chained audit event, and outbox event (root CLAUDE.md invariant 5). security invoker: every internal statement is still subject to the caller''s own RLS, same as if issued directly.';
