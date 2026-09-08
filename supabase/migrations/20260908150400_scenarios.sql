-- Scenario Studio core tables (spec §7-§9.5, §10.3). Scope note: this
-- migration covers scenarios, scenario_versions, scenario_runs, and
-- scenario_snapshots only. spec §9.5 also lists `scenario_events` — that
-- is deferred until a concrete consumer (e.g. the notification/outbox
-- work in a later migration) needs a domain event stream distinct from
-- the org-wide, hash-chained `audit_events` table; nothing here depends
-- on it, so it is not pre-declared unused.
--
-- Cardinality: company (1) -> scenario (many) -> scenario_version (many,
-- append-only) -> scenario_run (many, append-only, one per version+engine
-- invocation) -> scenario_snapshot (append-only, freezes one run). A
-- scenario's own row is the only mutable one in this chain (name/status);
-- editing inputs always creates a new version rather than mutating one
-- (spec §10.3), and every later step is add-only.

-- Company-scoped capability check, used by every table below and by
-- later company-scoped migrations. Defined here (not in companies.sql,
-- already applied) since this is the first table that needs it; the
-- underlying authz.has_capability() this wraps is unchanged.
create or replace function authz.has_capability_for_company(p_company_id uuid, p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and authz.has_capability(c.organization_id, p_capability)
  );
$$;

revoke all on function authz.has_capability_for_company(uuid, text) from public;
grant execute on function authz.has_capability_for_company(uuid, text) to authenticated;

comment on function authz.has_capability_for_company(uuid, text) is
  'True iff the calling user has the given capability in the organization that owns the given company. Shared by every company-scoped table (scenarios and beyond).';

create table public.scenarios (
  id uuid primary key default public.uuidv7(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  -- spec §10.3 scenario state machine, stored verbatim. Transition
  -- ordering is enforced by the application commands (createScenario,
  -- runScenario, freezeScenarioSnapshot, ...), not by a DB trigger — the
  -- same division of responsibility as every other state-vocabulary
  -- column in this project (see packages/ui's StateBadge states).
  status text not null default 'draft'
    check (status in ('draft', 'running', 'succeeded', 'failed', 'frozen_snapshot', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.scenarios is 'Scenario Studio container (spec §7, §10.3). Mutable metadata only — inputs live in scenario_versions, which are append-only.';

create index scenarios_company_id_idx on public.scenarios (company_id);

create trigger scenarios_set_updated_at
  before update on public.scenarios
  for each row
  execute function public.set_updated_at();

alter table public.scenarios enable row level security;
alter table public.scenarios force row level security;

create policy scenarios_select_with_capability on public.scenarios
  for select
  to authenticated
  using (authz.has_capability_for_company(company_id, 'scenario.read'));

create policy scenarios_insert_with_capability on public.scenarios
  for insert
  to authenticated
  with check (authz.has_capability_for_company(company_id, 'scenario.write'));

create policy scenarios_update_with_capability on public.scenarios
  for update
  to authenticated
  using (authz.has_capability_for_company(company_id, 'scenario.write'))
  with check (authz.has_capability_for_company(company_id, 'scenario.write'));

grant select, insert, update on public.scenarios to authenticated, service_role;

-- Append-only: editing a scenario always creates a new version (spec
-- §10.3) rather than mutating one. `input` mirrors packages/domain's
-- canonical Scenario JSON (schemaVersion, currency, existingCapitalization,
-- safes[]) byte-for-byte, so input_hash below reproduces
-- @gsk/audit's canonicalHash() over that exact JSON.
create table public.scenario_versions (
  id uuid primary key default public.uuidv7(),
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  input jsonb not null,
  input_schema_version integer not null,
  input_hash text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (scenario_id, version_number)
);

comment on table public.scenario_versions is 'Append-only frozen scenario inputs (spec §9.5, §10.3). created_by is nullable/ON DELETE SET NULL so this history survives a user account being removed.';

create index scenario_versions_scenario_id_idx on public.scenario_versions (scenario_id);

alter table public.scenario_versions enable row level security;
alter table public.scenario_versions force row level security;

create policy scenario_versions_select_with_capability on public.scenario_versions
  for select
  to authenticated
  using (authz.has_capability_for_company(
    (select company_id from public.scenarios where id = scenario_id), 'scenario.read'));

create policy scenario_versions_insert_with_capability on public.scenario_versions
  for insert
  to authenticated
  with check (authz.has_capability_for_company(
    (select company_id from public.scenarios where id = scenario_id), 'scenario.write'));

-- No update/delete policy or grant: versions are never edited or removed.
grant select, insert on public.scenario_versions to authenticated, service_role;

create trigger scenario_versions_append_only
  before update or delete on public.scenario_versions
  for each row
  execute function public.reject_update_delete();

-- Append-only: one row per engine invocation against a specific version.
-- The engine (packages/cap-table) is pure and synchronous, so a run is
-- inserted once, already resolved to succeeded or failed — there is no
-- separate "in progress" row to later update (that would violate
-- append-only, and the engine has no async step to be "in progress" for).
create table public.scenario_runs (
  id uuid primary key default public.uuidv7(),
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  scenario_version_id uuid not null references public.scenario_versions (id),
  engine_version text not null,
  status text not null check (status in ('succeeded', 'failed')),
  output jsonb,
  output_hash text,
  error_code text,
  error_message text,
  requested_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  constraint scenario_runs_outcome_consistency check (
    (status = 'succeeded' and output is not null and output_hash is not null
      and error_code is null and error_message is null)
    or
    (status = 'failed' and output is null and output_hash is null and error_code is not null)
  )
);

comment on table public.scenario_runs is 'Append-only engine invocation history (spec §9.5). output mirrors packages/cap-table''s SerializableCapSafeResult; error_code/error_message capture an UnsupportedCaseError (spec §7.9), never a silent approximation.';

create index scenario_runs_scenario_id_idx on public.scenario_runs (scenario_id);
create index scenario_runs_scenario_version_id_idx on public.scenario_runs (scenario_version_id);

alter table public.scenario_runs enable row level security;
alter table public.scenario_runs force row level security;

create policy scenario_runs_select_with_capability on public.scenario_runs
  for select
  to authenticated
  using (authz.has_capability_for_company(
    (select company_id from public.scenarios where id = scenario_id), 'scenario.read'));

create policy scenario_runs_insert_with_capability on public.scenario_runs
  for insert
  to authenticated
  with check (authz.has_capability_for_company(
    (select company_id from public.scenarios where id = scenario_id), 'scenario.run'));

grant select, insert on public.scenario_runs to authenticated, service_role;

create trigger scenario_runs_append_only
  before update or delete on public.scenario_runs
  for each row
  execute function public.reject_update_delete();

-- Append-only and immutable (root CLAUDE.md invariant 3 names scenario
-- snapshots explicitly). Denormalizes its own copy of input/output rather
-- than only pointing at scenario_versions/scenario_runs, so a frozen
-- snapshot's meaning can never change even in principle if an
-- interpretation of an upstream row were ever revised.
create table public.scenario_snapshots (
  id uuid primary key default public.uuidv7(),
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  scenario_version_id uuid not null references public.scenario_versions (id),
  scenario_run_id uuid not null references public.scenario_runs (id),
  input jsonb not null,
  output jsonb not null,
  -- Opaque bag for engine assumptions (e.g. rounding policy version) the
  -- spec requires snapshots to record but packages/cap-table does not yet
  -- emit as a structured field (its result today is rows/totals only) —
  -- kept as jsonb rather than named columns until the engine defines that
  -- shape, so this column is additive when it does.
  assumptions jsonb not null default '{}'::jsonb,
  engine_version text not null,
  input_schema_version integer not null,
  input_hash text not null,
  output_hash text not null,
  frozen_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.scenario_snapshots is 'Immutable, append-only frozen scenario record (spec §9.5, root CLAUDE.md invariant 3): frozen input/output JSON, assumptions, engine/schema versions, and cryptographic hashes.';

create index scenario_snapshots_scenario_id_idx on public.scenario_snapshots (scenario_id);

alter table public.scenario_snapshots enable row level security;
alter table public.scenario_snapshots force row level security;

create policy scenario_snapshots_select_with_capability on public.scenario_snapshots
  for select
  to authenticated
  using (authz.has_capability_for_company(
    (select company_id from public.scenarios where id = scenario_id), 'scenario.read'));

create policy scenario_snapshots_insert_with_capability on public.scenario_snapshots
  for insert
  to authenticated
  with check (authz.has_capability_for_company(
    (select company_id from public.scenarios where id = scenario_id), 'snapshot.freeze'));

grant select, insert on public.scenario_snapshots to authenticated, service_role;

create trigger scenario_snapshots_append_only
  before update or delete on public.scenario_snapshots
  for each row
  execute function public.reject_update_delete();
