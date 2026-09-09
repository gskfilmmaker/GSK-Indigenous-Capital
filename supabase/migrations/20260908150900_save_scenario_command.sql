-- The second real command (root CLAUDE.md invariant 5), mirroring
-- create_company()'s pattern exactly: saving a Scenario Studio scenario
-- (spec §7-§10.3, this project's Step 4 cap-SAFE scope). One call either
-- creates a scenario and its first version, or appends a new version to
-- an existing one — the engine run (packages/cap-table's runScenario(),
-- pure and synchronous) always happens in TypeScript before this
-- function is called; this function only persists its already-computed
-- input/output atomically alongside the idempotency, audit, and outbox
-- bookkeeping. See 20260908150800_create_company_command.sql's own
-- comment for the full reasoning behind this shape (security invoker,
-- idempotency semantics, why event_hash/prev_event_hash are computed by
-- the caller).
--
-- `p_scenario_id` is generated client-side the same way
-- `create_company`'s `p_company_id` is (packages/domain's
-- newScenarioId(), already used for the ephemeral, unpersisted Scenario
-- Studio's in-memory scenario id — this makes it the same id, not a
-- second one, once persistence is wired up) — needed before this
-- function runs so the audit event can reference it. `scenario_versions`
-- and `scenario_runs` rows keep their own server-generated ids: nothing
-- needs to know those in advance.
--
-- Returns jsonb rather than a single table row: the caller needs facts
-- from three different tables (the scenario id, the version number just
-- written, and the run's outcome), and none of scenarios/scenario_
-- versions/scenario_runs alone represents "the result of saving."
create or replace function public.save_scenario(
  p_company_id uuid,
  p_scenario_id uuid,
  p_scenario_name text,
  p_input jsonb,
  p_input_schema_version integer,
  p_input_hash text,
  p_engine_version text,
  p_run_status text,
  p_output jsonb,
  p_output_hash text,
  p_error_code text,
  p_error_message text,
  p_idempotency_key text,
  p_request_hash text,
  p_prev_event_hash text,
  p_event_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid;
  v_scenario public.scenarios;
  v_is_new_scenario boolean;
  v_next_version_number integer;
  v_version public.scenario_versions;
  v_run public.scenario_runs;
  v_idem public.idempotency_keys;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'save_scenario requires an authenticated user' using errcode = '28000';
  end if;

  select c.organization_id into v_organization_id from public.companies c where c.id = p_company_id;
  if v_organization_id is null then
    raise exception 'company not found' using errcode = '02000';
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
      return v_idem.response;
    elsif v_idem.status = 'in_progress' then
      raise exception 'a request with this idempotency key is already in progress' using errcode = '55P03';
    else
      update public.idempotency_keys
        set status = 'in_progress', request_hash = p_request_hash
        where organization_id = v_organization_id and idempotency_key = p_idempotency_key;
    end if;
  end if;

  select * into v_scenario from public.scenarios where id = p_scenario_id;
  v_is_new_scenario := not found;

  if v_is_new_scenario then
    insert into public.scenarios (id, company_id, name, status)
    values (p_scenario_id, p_company_id, p_scenario_name, 'draft')
    returning * into v_scenario;
    v_next_version_number := 1;
  else
    if v_scenario.company_id <> p_company_id then
      raise exception 'scenario does not belong to this company' using errcode = '42501';
    end if;
    select coalesce(max(version_number), 0) + 1 into v_next_version_number
    from public.scenario_versions
    where scenario_id = p_scenario_id;
  end if;

  insert into public.scenario_versions (
    scenario_id, version_number, input, input_schema_version, input_hash, created_by
  ) values (
    p_scenario_id, v_next_version_number, p_input, p_input_schema_version, p_input_hash, auth.uid()
  )
  returning * into v_version;

  insert into public.scenario_runs (
    scenario_id, scenario_version_id, engine_version, status, output, output_hash,
    error_code, error_message, requested_by
  ) values (
    p_scenario_id, v_version.id, p_engine_version, p_run_status, p_output, p_output_hash,
    p_error_code, p_error_message, auth.uid()
  )
  returning * into v_run;

  update public.scenarios
    set name = p_scenario_name, status = p_run_status
    where id = p_scenario_id;

  insert into public.audit_events (
    organization_id, prev_event_hash, event_hash, actor_user_id, action, resource_type, resource_id, payload
  ) values (
    v_organization_id, p_prev_event_hash, p_event_hash, auth.uid(),
    case when v_is_new_scenario then 'scenario.created' else 'scenario.version_saved' end,
    'scenario', p_scenario_id,
    jsonb_build_object('scenarioId', p_scenario_id, 'versionNumber', v_next_version_number, 'runStatus', p_run_status)
  );

  insert into public.outbox_events (organization_id, aggregate_type, aggregate_id, event_type, payload)
  values (
    v_organization_id, 'scenario', p_scenario_id,
    case when v_is_new_scenario then 'scenario.created' else 'scenario.version_saved' end,
    jsonb_build_object('scenarioId', p_scenario_id, 'versionNumber', v_next_version_number)
  );

  v_result := jsonb_build_object(
    'scenarioId', p_scenario_id,
    'versionNumber', v_next_version_number,
    'runId', v_run.id,
    'runStatus', v_run.status
  );

  update public.idempotency_keys
    set status = 'completed', response = v_result, completed_at = now()
    where organization_id = v_organization_id and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

revoke all on function public.save_scenario(
  uuid, uuid, text, jsonb, integer, text, text, text, jsonb, text, text, text, text, text, text, text
) from public;
grant execute on function public.save_scenario(
  uuid, uuid, text, jsonb, integer, text, text, text, jsonb, text, text, text, text, text, text, text
) to authenticated;

comment on function public.save_scenario(
  uuid, uuid, text, jsonb, integer, text, text, text, jsonb, text, text, text, text, text, text, text
) is
  'Creates a scenario (first call) or appends a new version to an existing one (later calls), plus its run, atomically alongside idempotency-key bookkeeping, a hash-chained audit event, and an outbox event (root CLAUDE.md invariant 5). security invoker, same reasoning as create_company().';
