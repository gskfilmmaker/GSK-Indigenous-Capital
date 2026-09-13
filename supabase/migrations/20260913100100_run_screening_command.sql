-- Third command (root CLAUDE.md invariant 5), mirroring create_company()
-- and save_scenario() exactly. The deal-screening engine
-- (packages/deal-screening, pure and synchronous, no verdict/score field
-- anywhere in its output shape) always runs in TypeScript before this
-- function is called; this function only persists the already-computed
-- input/output atomically alongside idempotency, audit, and outbox
-- bookkeeping, and freezes it as an immutable screening_snapshots row.
--
-- `p_snapshot_id` is generated client-side (packages/domain's
-- newScreeningSnapshotId(), same pattern as newScenarioId()) so the audit
-- event can reference it before the insert.
create or replace function public.run_screening(
  p_startup_intake_id uuid,
  p_investor_thesis_id uuid,
  p_snapshot_id uuid,
  p_input jsonb,
  p_output jsonb,
  p_engine_version text,
  p_input_hash text,
  p_output_hash text,
  p_idempotency_key text,
  p_request_hash text,
  p_prev_event_hash text,
  p_event_hash text
)
returns public.screening_snapshots
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid;
  v_snapshot public.screening_snapshots;
  v_idem public.idempotency_keys;
begin
  if auth.uid() is null then
    raise exception 'run_screening requires an authenticated user' using errcode = '28000';
  end if;

  select i.organization_id into v_organization_id
  from public.startup_intakes i
  where i.id = p_startup_intake_id;
  if v_organization_id is null then
    raise exception 'startup intake not found' using errcode = '02000';
  end if;

  if p_investor_thesis_id is not null then
    if not exists (
      select 1 from public.investor_theses t
      where t.id = p_investor_thesis_id and t.organization_id = v_organization_id
    ) then
      raise exception 'investor thesis does not belong to this organization' using errcode = '42501';
    end if;
  end if;

  insert into public.idempotency_keys (organization_id, idempotency_key, request_hash, status)
  values (v_organization_id, p_idempotency_key, p_request_hash, 'in_progress')
  on conflict (organization_id, idempotency_key) do nothing
  returning * into v_idem;

  if not found then
    select * into v_idem
    from public.idempotency_keys
    where organization_id = v_organization_id and idempotency_key = p_idempotency_key;

    if v_idem.status = 'completed' then
      if v_idem.request_hash <> p_request_hash then
        raise exception 'idempotency key reused with a different request payload' using errcode = '23514';
      end if;
      select * into v_snapshot from public.screening_snapshots where id = (v_idem.response ->> 'snapshotId')::uuid;
      return v_snapshot;
    elsif v_idem.status = 'in_progress' then
      raise exception 'a request with this idempotency key is already in progress' using errcode = '55P03';
    else
      update public.idempotency_keys
        set status = 'in_progress', request_hash = p_request_hash
        where organization_id = v_organization_id and idempotency_key = p_idempotency_key;
    end if;
  end if;

  insert into public.screening_snapshots (
    id, startup_intake_id, investor_thesis_id, input, output, engine_version, input_hash, output_hash, computed_by
  ) values (
    p_snapshot_id, p_startup_intake_id, p_investor_thesis_id, p_input, p_output, p_engine_version,
    p_input_hash, p_output_hash, auth.uid()
  )
  returning * into v_snapshot;

  insert into public.audit_events (
    organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id, payload
  ) values (
    v_organization_id, p_prev_event_hash, p_event_hash, auth.uid(), 'screening.run', 'screening_snapshot',
    v_snapshot.id, jsonb_build_object('snapshotId', v_snapshot.id, 'startupIntakeId', p_startup_intake_id)
  );

  insert into public.outbox_events (organization_id, aggregate_type, aggregate_id, event_type, payload)
  values (
    v_organization_id, 'screening_snapshot', v_snapshot.id, 'screening.run',
    jsonb_build_object('snapshotId', v_snapshot.id, 'startupIntakeId', p_startup_intake_id)
  );

  update public.idempotency_keys
    set status = 'completed', response = jsonb_build_object('snapshotId', v_snapshot.id), completed_at = now()
    where organization_id = v_organization_id and idempotency_key = p_idempotency_key;

  return v_snapshot;
end;
$$;

revoke all on function public.run_screening(
  uuid, uuid, uuid, jsonb, jsonb, text, text, text, text, text, text, text
) from public;
grant execute on function public.run_screening(
  uuid, uuid, uuid, jsonb, jsonb, text, text, text, text, text, text, text
) to authenticated;

comment on function public.run_screening(
  uuid, uuid, uuid, jsonb, jsonb, text, text, text, text, text, text, text
) is
  'Freezes one deal-screening engine run as an immutable screening_snapshots row, atomically alongside idempotency-key bookkeeping, a hash-chained audit event, and an outbox event (root CLAUDE.md invariant 5). security invoker, same reasoning as create_company()/save_scenario(). The output jsonb it persists is constrained by screening_snapshots_output_never_a_verdict — this function does not itself enforce that shape, the table does.';
