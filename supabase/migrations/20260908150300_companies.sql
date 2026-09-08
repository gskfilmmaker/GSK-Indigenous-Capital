-- Issuer/company profile (spec §6.2 onboarding, §9.2). One company belongs
-- to exactly one organization; every later Step 4 table (scenarios, ...) is
-- scoped through company_id -> organization_id.
--
-- Scope note: this migration covers only the onboarding fields spec §6.2
-- lists as collected today (legal identity, incorporation, addresses,
-- currency, governing-document flags). It deliberately does NOT add the
-- optional Indigenous/community self-identification fields spec §6.2 and
-- §12 describe, because those require the `community_data_protocols`
-- review-before-ingestion flow spec §12 mandates and a disclosed feature
-- to attach them to — neither exists yet. Root CLAUDE.md instructs
-- stopping rather than inventing an Indigenous identity requirement; that
-- table/feature is deferred to the migration that actually builds the
-- disclosed program it serves, not pre-declared unused here.

create type public.incorporation_statute as enum ('OBCA', 'CBCA', 'OTHER', 'UNKNOWN');

comment on type public.incorporation_statute is
  'Incorporation statute/jurisdiction choices offered at onboarding (spec §6.2). OTHER/UNKNOWN are both accepted so onboarding is never blocked on this field; unknown governing documents instead block the final legal-document workflow downstream (spec §6.2), not company creation.';

create table public.companies (
  id uuid primary key default public.uuidv7(),
  organization_id uuid not null references public.organizations (id) on delete cascade,

  legal_name text not null check (char_length(legal_name) between 1 and 200),
  operating_name text check (operating_name is null or char_length(operating_name) between 1 and 200),

  incorporation_statute public.incorporation_statute not null default 'UNKNOWN',
  -- Free-text statute name, required exactly when incorporation_statute is
  -- OTHER and disallowed otherwise, so the column never silently disagrees
  -- with the enum value.
  incorporation_statute_other text,
  corporation_number text,
  incorporation_date date,

  -- Deliberately jsonb rather than a normalized address table: no other
  -- Step 4 feature queries address components individually, and the two
  -- addresses share no relational structure with any other table.
  -- Documented shape: {line1, line2, city, province_or_territory,
  -- postal_code, country}. All keys optional; validated at the
  -- application layer (Zod), not by the database.
  registered_address jsonb,
  head_office_address jsonb,

  default_currency char(3) not null default 'CAD' check (default_currency ~ '^[A-Z]{3}$'),

  -- Governing-document/reserved-matter flags (spec §6.2). Coarse-grained
  -- booleans, not an enumeration of specific reserved matters or clause
  -- text — the spec doesn't define that structure yet, and inventing one
  -- here would be exactly the kind of unrequested legal-term invention
  -- root CLAUDE.md prohibits. These flags exist so onboarding can record
  -- "review this before drafting" without asserting what the review finds.
  has_shareholder_agreement boolean not null default false,
  has_unanimous_shareholder_agreement boolean not null default false,
  has_investor_rights_agreement boolean not null default false,
  has_debt_covenant boolean not null default false,
  has_reserved_matters boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint companies_statute_other_consistency check (
    (incorporation_statute = 'OTHER' and incorporation_statute_other is not null
      and char_length(incorporation_statute_other) between 1 and 200)
    or (incorporation_statute <> 'OTHER' and incorporation_statute_other is null)
  )
);

comment on table public.companies is 'Issuer/company profile captured at onboarding (spec §6.2). One organization may have more than one company; every company belongs to exactly one organization.';

create index companies_organization_id_idx on public.companies (organization_id);

create trigger companies_set_updated_at
  before update on public.companies
  for each row
  execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.companies force row level security;

create policy companies_select_with_capability on public.companies
  for select
  to authenticated
  using (authz.has_capability(organization_id, 'company.read'));

create policy companies_insert_with_capability on public.companies
  for insert
  to authenticated
  with check (authz.has_capability(organization_id, 'company.write'));

create policy companies_update_with_capability on public.companies
  for update
  to authenticated
  using (authz.has_capability(organization_id, 'company.write'))
  with check (authz.has_capability(organization_id, 'company.write'));

-- No delete policy: a company is a permanent issuer record once created.
-- Deletion is not supported in Step 4 (matches the organizations table's
-- own no-delete stance).
grant select, insert, update on public.companies to authenticated, service_role;
