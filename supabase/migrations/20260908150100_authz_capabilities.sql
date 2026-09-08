-- Capability model (spec §4.2, docs/adr/0003-supabase-rls-strategy.md):
-- capabilities, not scattered role-name checks. This migration defines the
-- reference vocabulary; the `authz.has_capability()` function that checks
-- it lives in the organization_memberships migration, since it depends on
-- that table.
--
-- Scope note: only the capabilities Step 4's tables (organizations,
-- memberships, companies, scenarios/versions/runs/snapshots, share links,
-- audit) actually enforce are seeded here. Spec §4.2's full list also
-- covers stakeholder/ledger/template/document/board/investment/payment/
-- compliance/filing/platform capabilities for modules not built yet —
-- those are inserted by the migrations that build those modules, not
-- pre-declared unused here.

create type public.member_role as enum ('owner', 'admin', 'editor', 'viewer');

comment on type public.member_role is
  'Organization-internal roles in scope for Step 4 (spec §4.1 subset). Counsel/Finance Approver/Investor Portal/Platform Administrator roles are added when the modules that need them (governance, compliance, investor portal, platform admin) are built.';

create table public.capabilities (
  code text primary key,
  description text not null
);

comment on table public.capabilities is 'Reference vocabulary of capabilities (spec §4.2). Rows are added by the migration that introduces the module needing them — never pre-declared speculatively.';

insert into public.capabilities (code, description) values
  ('org.read', 'View organization details and membership'),
  ('org.manage', 'Manage organization settings'),
  ('member.invite', 'Invite new organization members'),
  ('member.role.change', 'Change an existing member''s role'),
  ('company.read', 'View company/issuer profile'),
  ('company.write', 'Edit company/issuer profile'),
  ('scenario.read', 'View SAFE scenarios'),
  ('scenario.write', 'Create and edit SAFE scenarios'),
  ('scenario.run', 'Run scenario calculations'),
  ('snapshot.freeze', 'Freeze a scenario snapshot'),
  ('snapshot.share', 'Create or revoke a snapshot share link'),
  ('audit.read', 'View the organization''s audit log');

create table public.role_capabilities (
  role public.member_role not null,
  capability text not null references public.capabilities (code),
  primary key (role, capability)
);

comment on table public.role_capabilities is 'Static role -> capability mapping. Not user-editable in Step 4 — a fixed table, not yet an admin-configurable RBAC system (spec §26 does not ask for one at this stage).';

insert into public.role_capabilities (role, capability)
values
  -- owner and admin: everything in scope for Step 4.
  ('owner', 'org.read'),
  ('owner', 'org.manage'),
  ('owner', 'member.invite'),
  ('owner', 'member.role.change'),
  ('owner', 'company.read'),
  ('owner', 'company.write'),
  ('owner', 'scenario.read'),
  ('owner', 'scenario.write'),
  ('owner', 'scenario.run'),
  ('owner', 'snapshot.freeze'),
  ('owner', 'snapshot.share'),
  ('owner', 'audit.read'),
  ('admin', 'org.read'),
  ('admin', 'org.manage'),
  ('admin', 'member.invite'),
  ('admin', 'member.role.change'),
  ('admin', 'company.read'),
  ('admin', 'company.write'),
  ('admin', 'scenario.read'),
  ('admin', 'scenario.write'),
  ('admin', 'scenario.run'),
  ('admin', 'snapshot.freeze'),
  ('admin', 'snapshot.share'),
  ('admin', 'audit.read'),
  -- editor: models and edits, no member/org management, no audit.
  ('editor', 'org.read'),
  ('editor', 'company.read'),
  ('editor', 'company.write'),
  ('editor', 'scenario.read'),
  ('editor', 'scenario.write'),
  ('editor', 'scenario.run'),
  ('editor', 'snapshot.freeze'),
  ('editor', 'snapshot.share'),
  -- viewer: read-only.
  ('viewer', 'org.read'),
  ('viewer', 'company.read'),
  ('viewer', 'scenario.read'),
  ('viewer', 'audit.read');

-- Reference tables: readable by any authenticated user (the vocabulary
-- itself isn't tenant data), never writable by application roles.
-- RLS policies only filter rows a role can already reach — the role also
-- needs the underlying SQL privilege via GRANT, or every query sees zero
-- rows for lack of access rather than for failing a policy. Every table
-- in this project pairs its policies with matching grants for exactly
-- this reason.
alter table public.capabilities enable row level security;
alter table public.capabilities force row level security;
create policy capabilities_select_authenticated on public.capabilities
  for select
  to authenticated
  using (true);
grant select on public.capabilities to authenticated, service_role;

alter table public.role_capabilities enable row level security;
alter table public.role_capabilities force row level security;
create policy role_capabilities_select_authenticated on public.role_capabilities
  for select
  to authenticated
  using (true);
grant select on public.role_capabilities to authenticated, service_role;
