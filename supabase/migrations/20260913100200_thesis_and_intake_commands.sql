-- Two more commands (root CLAUDE.md invariant 5), mirroring
-- create_company() exactly: creating an investor_theses row and a
-- startup_intakes row are both real mutations, not exempt from
-- idempotency/audit/outbox just because they aren't the "first" command
-- in this feature.
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

  insert into public.investor_theses (id, organization_id, name, criteria, created_by)
  values (p_thesis_id, p_organization_id, p_thesis ->> 'name', coalesce(p_thesis -> 'criteria', '[]'::jsonb), auth.uid())
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

revoke all on function public.create_investor_thesis(uuid, uuid, jsonb, text, text, text, text) from public;
grant execute on function public.create_investor_thesis(uuid, uuid, jsonb, text, text, text, text) to authenticated;

comment on function public.create_investor_thesis(uuid, uuid, jsonb, text, text, text, text) is
  'Creates an investor thesis atomically alongside idempotency-key bookkeeping, a hash-chained audit event, and an outbox event (root CLAUDE.md invariant 5). security invoker, same reasoning as create_company().';

create or replace function public.create_startup_intake(
  p_organization_id uuid,
  p_intake_id uuid,
  p_intake jsonb,
  p_idempotency_key text,
  p_request_hash text,
  p_prev_event_hash text,
  p_event_hash text
)
returns public.startup_intakes
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_intake public.startup_intakes;
  v_idem public.idempotency_keys;
begin
  if auth.uid() is null then
    raise exception 'create_startup_intake requires an authenticated user' using errcode = '28000';
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
      select * into v_intake from public.startup_intakes where id = (v_idem.response ->> 'intakeId')::uuid;
      return v_intake;
    elsif v_idem.status = 'in_progress' then
      raise exception 'a request with this idempotency key is already in progress' using errcode = '55P03';
    else
      update public.idempotency_keys
        set status = 'in_progress', request_hash = p_request_hash
        where organization_id = p_organization_id and idempotency_key = p_idempotency_key;
    end if;
  end if;

  insert into public.startup_intakes (id, organization_id, company_name, industry, stage, intake_data, created_by)
  values (
    p_intake_id, p_organization_id,
    p_intake ->> 'companyName', p_intake ->> 'industry', p_intake ->> 'stage',
    coalesce(p_intake -> 'intakeData', '{}'::jsonb), auth.uid()
  )
  returning * into v_intake;

  insert into public.audit_events (
    organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id, payload
  ) values (
    p_organization_id, p_prev_event_hash, p_event_hash, auth.uid(), 'intake.created', 'startup_intake', v_intake.id,
    jsonb_build_object('intakeId', v_intake.id)
  );

  insert into public.outbox_events (organization_id, aggregate_type, aggregate_id, event_type, payload)
  values (p_organization_id, 'startup_intake', v_intake.id, 'intake.created', jsonb_build_object('intakeId', v_intake.id));

  update public.idempotency_keys
    set status = 'completed', response = jsonb_build_object('intakeId', v_intake.id), completed_at = now()
    where organization_id = p_organization_id and idempotency_key = p_idempotency_key;

  return v_intake;
end;
$$;

revoke all on function public.create_startup_intake(uuid, uuid, jsonb, text, text, text, text) from public;
grant execute on function public.create_startup_intake(uuid, uuid, jsonb, text, text, text, text) to authenticated;

comment on function public.create_startup_intake(uuid, uuid, jsonb, text, text, text, text) is
  'Creates a startup intake atomically alongside idempotency-key bookkeeping, a hash-chained audit event, and an outbox event (root CLAUDE.md invariant 5). security invoker, same reasoning as create_company().';
