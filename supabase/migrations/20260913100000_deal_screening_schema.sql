-- Deal-screening schema (packages/deal-screening; see its CLAUDE.md and
-- docs/adr/0008, 0009). Three tables:
--
--   investor_theses   - an investor's own named thresholds per metric
--                       (never this app's thresholds — see thesisFit.ts).
--   startup_intakes   - a founder's submitted data for one startup,
--                       screened by one investor organization.
--   screening_snapshots - append-only, immutable frozen output of running
--                       packages/deal-screening against one intake (and,
--                       optionally, one thesis) at a point in time. This is
--                       the "scenario_snapshots" of this feature, and gets
--                       the same root CLAUDE.md invariant 3 treatment.
--
-- New capabilities (spec §4.2 pattern: seeded by the migration that
-- introduces the module needing them, not pre-declared).
insert into public.capabilities (code, description) values
  ('thesis.read', 'View an investor''s screening thesis (criteria/thresholds)'),
  ('thesis.write', 'Create and edit an investor''s screening thesis'),
  ('intake.read', 'View a startup''s submitted screening intake'),
  ('intake.write', 'Create and edit a startup''s submitted screening intake'),
  ('screening.run', 'Run the deal-screening engine and freeze a screening snapshot');

insert into public.role_capabilities (role, capability) values
  ('owner', 'thesis.read'), ('owner', 'thesis.write'),
  ('owner', 'intake.read'), ('owner', 'intake.write'), ('owner', 'screening.run'),
  ('admin', 'thesis.read'), ('admin', 'thesis.write'),
  ('admin', 'intake.read'), ('admin', 'intake.write'), ('admin', 'screening.run'),
  ('editor', 'thesis.read'), ('editor', 'thesis.write'),
  ('editor', 'intake.read'), ('editor', 'intake.write'), ('editor', 'screening.run'),
  ('viewer', 'thesis.read'), ('viewer', 'intake.read');

create table public.investor_theses (
  id uuid primary key default public.uuidv7(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  -- Matches packages/domain's InvestorThesis schema: an array of
  -- {metric, label, comparator, threshold} rows, threshold as a decimal
  -- string (root CLAUDE.md invariant 2 — never a native numeric column
  -- an app could misread as a JS float). Validated by Zod before it ever
  -- reaches this column; this table trusts already-validated JSON, same
  -- as scenarios.input.
  criteria jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.investor_theses is 'An investor''s own named screening thresholds (packages/deal-screening''s thesisFit.ts). Never the app''s own thresholds — see packages/deal-screening/CLAUDE.md.';

create index investor_theses_organization_id_idx on public.investor_theses (organization_id);

create trigger investor_theses_set_updated_at
  before update on public.investor_theses
  for each row
  execute function public.set_updated_at();

alter table public.investor_theses enable row level security;
alter table public.investor_theses force row level security;

create policy investor_theses_select_with_capability on public.investor_theses
  for select
  to authenticated
  using (authz.has_capability(organization_id, 'thesis.read'));

create policy investor_theses_insert_with_capability on public.investor_theses
  for insert
  to authenticated
  with check (authz.has_capability(organization_id, 'thesis.write'));

create policy investor_theses_update_with_capability on public.investor_theses
  for update
  to authenticated
  using (authz.has_capability(organization_id, 'thesis.write'))
  with check (authz.has_capability(organization_id, 'thesis.write'));

grant select, insert, update on public.investor_theses to authenticated, service_role;

create table public.startup_intakes (
  id uuid primary key default public.uuidv7(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 200),
  industry text not null check (char_length(industry) between 1 and 100),
  stage text not null check (stage in ('pre_seed', 'seed', 'series_a', 'growth')),
  -- Matches packages/domain's StartupIntake schema (financials, market
  -- sizing inputs, Berkus/Scorecard ratings, exit assumption) — same
  -- validated-jsonb pattern as scenarios.input. Per ADR 0009 rule 5, any
  -- Indigenous identity/community data field is excluded from this
  -- column entirely, not merely excluded from AI extraction.
  intake_data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'archived', 'withdrawn')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.startup_intakes is 'A founder''s submitted data for one startup, scoped to the investor organization screening it (ADR 0009). Mutable while draft/submitted; withdrawn/archived rather than deleted once a screening_snapshot references it (root CLAUDE.md invariant 4).';

create index startup_intakes_organization_id_idx on public.startup_intakes (organization_id);

create trigger startup_intakes_set_updated_at
  before update on public.startup_intakes
  for each row
  execute function public.set_updated_at();

alter table public.startup_intakes enable row level security;
alter table public.startup_intakes force row level security;

create policy startup_intakes_select_with_capability on public.startup_intakes
  for select
  to authenticated
  using (authz.has_capability(organization_id, 'intake.read'));

create policy startup_intakes_insert_with_capability on public.startup_intakes
  for insert
  to authenticated
  with check (authz.has_capability(organization_id, 'intake.write'));

create policy startup_intakes_update_with_capability on public.startup_intakes
  for update
  to authenticated
  using (authz.has_capability(organization_id, 'intake.write'))
  with check (authz.has_capability(organization_id, 'intake.write'));

grant select, insert, update on public.startup_intakes to authenticated, service_role;

-- Company-scoped-style capability check for the intake -> organization
-- hop, matching authz.has_capability_for_company's shape exactly.
create or replace function authz.has_capability_for_intake(p_intake_id uuid, p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.startup_intakes i
    where i.id = p_intake_id
      and authz.has_capability(i.organization_id, p_capability)
  );
$$;

revoke all on function authz.has_capability_for_intake(uuid, text) from public;
grant execute on function authz.has_capability_for_intake(uuid, text) to authenticated;

-- Append-only and immutable (root CLAUDE.md invariant 3): the frozen
-- output of running packages/deal-screening once. Denormalizes its own
-- copy of the intake/thesis data used, exactly like scenario_snapshots
-- denormalizes scenario input/output, so a frozen result's meaning can
-- never change even if the upstream intake or thesis is later edited.
--
-- The check constraint below is a second, database-level enforcement of
-- packages/deal-screening/CLAUDE.md's lead rule: this column may never
-- hold a collapsed verdict, on top of the application-layer discipline
-- that already never produces one.
create table public.screening_snapshots (
  id uuid primary key default public.uuidv7(),
  startup_intake_id uuid not null references public.startup_intakes (id) on delete cascade,
  investor_thesis_id uuid references public.investor_theses (id),
  input jsonb not null,
  output jsonb not null,
  engine_version text not null,
  input_hash text not null,
  output_hash text not null,
  computed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint screening_snapshots_output_never_a_verdict check (
    not (output ? 'verdict')
    and not (output ? 'score')
    and not (output ? 'overallScore')
    and not (output ? 'recommendation')
    and not (output ? 'rating')
  )
);

comment on table public.screening_snapshots is 'Immutable, append-only frozen deal-screening result (packages/deal-screening, root CLAUDE.md invariant 3). The check constraint blocks a collapsed verdict/score field from ever being persisted, mirroring the engine''s own no-verdict discipline at the storage layer.';

create index screening_snapshots_startup_intake_id_idx on public.screening_snapshots (startup_intake_id);
create index screening_snapshots_investor_thesis_id_idx on public.screening_snapshots (investor_thesis_id);

alter table public.screening_snapshots enable row level security;
alter table public.screening_snapshots force row level security;

create policy screening_snapshots_select_with_capability on public.screening_snapshots
  for select
  to authenticated
  using (authz.has_capability_for_intake(startup_intake_id, 'intake.read'));

create policy screening_snapshots_insert_with_capability on public.screening_snapshots
  for insert
  to authenticated
  with check (authz.has_capability_for_intake(startup_intake_id, 'screening.run'));

grant select, insert on public.screening_snapshots to authenticated, service_role;

create trigger screening_snapshots_append_only
  before update or delete on public.screening_snapshots
  for each row
  execute function public.reject_update_delete();
