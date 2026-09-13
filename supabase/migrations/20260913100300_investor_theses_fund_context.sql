-- Fixes a real gap found while building the deal-screening UI:
-- create_investor_thesis() (20260913100200) only ever inserted `name`
-- and `criteria` from its `p_thesis` payload — packages/domain's
-- `CreateInvestorThesisInput.fundContext` (the VC Method's fund
-- size/target return/hold years, set once per thesis) had nowhere to
-- land and was silently dropped on every save.
alter table public.investor_theses add column fund_context jsonb;

comment on column public.investor_theses.fund_context is
  'Optional VC Method fund parameters (fundSize, targetAnnualReturn, targetHoldYears) — packages/domain''s ThesisFundContext. Null when the investor has not set fund context for this thesis.';

create or replace function public.create_investor_thesis(
  p_organization_id uuid,
  p_thesis_id uuid,
  p_thesis jsonb,
  p_idempotency_key text,
  p_request_hash text,
  p_prev_event_hash text,
  p_event_hash text
)
returns public.investor_theses
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_thesis public.investor_theses;
  v_idem public.idempotency_keys;
begin
  if auth.uid() is null then
    raise exception 'create_investor_thesis requires an authenticated user' using errcode = '28000';
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
      select * into v_thesis from public.investor_theses where id = (v_idem.response ->> 'thesisId')::uuid;
      return v_thesis;
    elsif v_idem.status = 'in_progress' then
      raise exception 'a request with this idempotency key is already in progress' using errcode = '55P03';
    else
      update public.idempotency_keys
        set status = 'in_progress', request_hash = p_request_hash
        where organization_id = p_organization_id and idempotency_key = p_idempotency_key;
    end if;
  end if;

  insert into public.investor_theses (id, organization_id, name, criteria, fund_context, created_by)
  values (
    p_thesis_id, p_organization_id, p_thesis ->> 'name', coalesce(p_thesis -> 'criteria', '[]'::jsonb),
    p_thesis -> 'fundContext', auth.uid()
  )
  returning * into v_thesis;

  insert into public.audit_events (
    organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id, payload
  ) values (
    p_organization_id, p_prev_event_hash, p_event_hash, auth.uid(), 'thesis.created', 'investor_thesis', v_thesis.id,
    jsonb_build_object('thesisId', v_thesis.id)
  );

  insert into public.outbox_events (organization_id, aggregate_type, aggregate_id, event_type, payload)
  values (p_organization_id, 'investor_thesis', v_thesis.id, 'thesis.created', jsonb_build_object('thesisId', v_thesis.id));

  update public.idempotency_keys
    set status = 'completed', response = jsonb_build_object('thesisId', v_thesis.id), completed_at = now()
    where organization_id = p_organization_id and idempotency_key = p_idempotency_key;

  return v_thesis;
end;
$$;

comment on function public.create_investor_thesis(uuid, uuid, jsonb, text, text, text, text) is
  'Creates an investor thesis (including optional fund_context) atomically alongside idempotency-key bookkeeping, a hash-chained audit event, and an outbox event (root CLAUDE.md invariant 5). security invoker, same reasoning as create_company().';
