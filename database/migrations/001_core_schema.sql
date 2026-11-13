-- =============================================================================
-- DPWH 360° – 001_core_schema.sql
-- Phase 1: enums, helper functions, users/profiles, lookups (municipalities,
-- barangays, agencies, contractors), projects and system settings.
-- RLS is enabled here; the policies and grants are in 005_rls_views.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role         as enum ('administrator', 'dpwh_personnel', 'auditor', 'public_viewer');
create type public.project_type      as enum ('road', 'bridge', 'flood_control');
-- Administrative state, set by people.
create type public.project_status    as enum ('active', 'suspended', 'cancelled');
-- Completion state, detected automatically by the flag engine (004).
create type public.completion_status as enum ('not_started', 'ongoing', 'delayed', 'completed');
create type public.flag_color        as enum ('green', 'yellow', 'red');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth.users row)
-- ---------------------------------------------------------------------------
create table public.implementing_agencies (
  agency_id     uuid primary key default gen_random_uuid(),
  name          text not null unique check (length(trim(name)) > 0),
  acronym       text,
  office_type   text not null default 'district_engineering_office'
                check (office_type in ('regional_office', 'district_engineering_office',
                                       'provincial_office', 'central_office', 'other')),
  address       text,
  contact_email text,
  contact_phone text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text check (full_name is null or length(full_name) <= 150),
  email          text,
  role           public.user_role not null default 'public_viewer',
  requested_role public.user_role check (requested_role is null or requested_role <> 'administrator'),
  is_approved    boolean not null default false,
  is_active      boolean not null default true,
  agency_id      uuid references public.implementing_agencies (agency_id) on delete set null,
  office         text check (office is null or length(office) <= 200),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index profiles_agency_id_idx on public.profiles (agency_id);
create index profiles_role_idx      on public.profiles (role);

-- Role helpers used by every RLS policy. SECURITY DEFINER so they can read
-- profiles without recursive RLS evaluation.
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_approved and p.is_active;
$$;

create or replace function public.has_role(variadic roles public.user_role[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_approved and p.is_active and p.role = any (roles)
  );
$$;

-- "Staff" = anyone who may see unpublished/internal records.
create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.has_role('administrator', 'dpwh_personnel', 'auditor');
$$;

-- New sign-ups always start as an approved public_viewer. Someone who asks for
-- dpwh_personnel or auditor is stored as requested_role and stays unapproved
-- until an administrator approves them with admin_set_user_access().
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_requested  text    := new.raw_user_meta_data ->> 'requested_role';
  v_privileged boolean := coalesce(v_requested in ('dpwh_personnel', 'auditor'), false);
begin
  insert into public.profiles (id, email, full_name, office, role, requested_role, is_approved)
  values (
    new.id,
    new.email,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 150), ''),
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'office', '')), 200), ''),
    'public_viewer',
    case when v_privileged then v_requested::public.user_role end,
    not v_privileged
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_agencies_updated before update on public.implementing_agencies
  for each row execute function public.set_updated_at();

-- Admin-only RPC to change role / approval / activation / office of a user.
-- (Column grants on profiles never include role or is_approved, so this is the
-- only way to change them from the API.)
create or replace function public.admin_set_user_access(
  p_user_id     uuid,
  p_role        public.user_role default null,
  p_is_approved boolean          default null,
  p_is_active   boolean          default null,
  p_agency_id   uuid             default null
)
returns public.profiles
language plpgsql security definer
set search_path = ''
as $$
declare
  v_row public.profiles;
begin
  if not public.has_role('administrator') then
    raise exception 'Only administrators can change user access' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() and (p_role is distinct from null and p_role <> 'administrator'
                                 or p_is_active is false or p_is_approved is false) then
    raise exception 'Administrators cannot demote or deactivate themselves' using errcode = '42501';
  end if;

  update public.profiles
     set role           = coalesce(p_role, role),
         is_approved    = coalesce(p_is_approved, is_approved),
         is_active      = coalesce(p_is_active, is_active),
         agency_id      = coalesce(p_agency_id, agency_id),
         requested_role = case when p_role is not null or p_is_approved then null else requested_role end
   where id = p_user_id
   returning * into v_row;

  if not found then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
  end if;
  return v_row;
end $$;

-- Recreate profiles for existing auth users and restore backed-up roles.
insert into public.profiles (id, email, full_name, role, is_approved)
select u.id, u.email, nullif(u.raw_user_meta_data ->> 'full_name', ''), 'public_viewer', true
from auth.users u
on conflict (id) do nothing;

do $$
begin
  if to_regclass('public._profile_backup') is not null then
    update public.profiles p
       set role        = b.role::public.user_role,
           is_approved = b.is_approved,
           full_name   = coalesce(b.full_name, p.full_name),
           office      = b.office
      from public._profile_backup b
     where b.id = p.id;
    drop table public._profile_backup;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Location lookups
-- ---------------------------------------------------------------------------
create table public.municipalities (
  municipality_id smallint generated always as identity primary key,
  name            text not null unique,
  district        text,                         -- e.g. 'Lone District'
  center_lat      numeric(9,6),
  center_lng      numeric(9,6)
);

insert into public.municipalities (name, center_lat, center_lng) values
  ('Abra de Ilog', 13.445000, 120.727000),
  ('Calintaan',    12.575000, 120.943000),
  ('Looc',         13.735000, 120.255000),
  ('Lubang',       13.858000, 120.124000),
  ('Magsaysay',    12.311000, 121.146000),
  ('Mamburao',     13.223000, 120.596000),
  ('Paluan',       13.415000, 120.463000),
  ('Rizal',        12.466000, 120.976000),
  ('Sablayan',     12.837000, 120.778000),
  ('San Jose',     12.353000, 121.068000),
  ('Santa Cruz',   13.077000, 120.715000);

create table public.barangays (
  barangay_id     integer generated always as identity primary key,
  municipality_id smallint not null references public.municipalities (municipality_id),
  name            text not null check (length(trim(name)) > 0),
  unique (municipality_id, name),
  unique (municipality_id, barangay_id)          -- target of the composite FK below
);

-- ---------------------------------------------------------------------------
-- Contractors
-- ---------------------------------------------------------------------------
create table public.contractors (
  contractor_id  uuid primary key default gen_random_uuid(),
  name           text not null unique check (length(trim(name)) > 0),
  license_number text unique,                    -- PCAB license no.
  address        text,
  contact_person text,
  contact_email  text,
  contact_phone  text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_contractors_updated before update on public.contractors
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table public.projects (
  project_id             uuid primary key default gen_random_uuid(),
  project_code           text not null unique check (length(trim(project_code)) > 0),
  contract_reference_no  text unique,
  name                   text not null check (length(trim(name)) > 0),
  description            text,
  project_type           public.project_type not null,

  agency_id              uuid not null references public.implementing_agencies (agency_id),
  contractor_id          uuid references public.contractors (contractor_id),

  approved_budget        numeric(15,2) not null check (approved_budget > 0),
  contract_amount        numeric(15,2) check (contract_amount > 0),

  municipality_id        smallint not null references public.municipalities (municipality_id),
  barangay_id            integer,
  latitude               numeric(9,6) not null check (latitude  between 12.10  and 13.95),
  longitude              numeric(9,6) not null check (longitude between 119.95 and 121.20),

  notice_to_proceed      date,
  duration_days          integer not null check (duration_days > 0),
  target_completion_date date,
  actual_completion_date date,
  status                 public.project_status not null default 'active',

  -- System-computed by evaluate_project() (004). Not writable from the API.
  overall_progress       numeric(5,2) not null default 0,
  planned_progress       numeric(5,2) not null default 0,
  financial_progress     numeric(6,2) not null default 0,
  completion_status      public.completion_status not null default 'not_started',
  auto_flag              public.flag_color,
  effective_flag         public.flag_color,
  flag_reasons           jsonb not null default '[]'::jsonb,
  last_evaluated_at      timestamptz,
  needs_review           boolean not null default false,

  -- Public disclosure
  is_published           boolean not null default false,
  published_at           timestamptz,
  published_by           uuid references public.profiles (id),

  created_by             uuid references public.profiles (id) default auth.uid(),
  deleted_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint projects_barangay_in_municipality
    foreign key (municipality_id, barangay_id)
    references public.barangays (municipality_id, barangay_id),
  constraint projects_contract_within_budget
    check (contract_amount is null or contract_amount <= approved_budget),
  constraint projects_dates_order
    check (target_completion_date is null or notice_to_proceed is null
           or target_completion_date >= notice_to_proceed),
  constraint projects_actual_after_ntp
    check (actual_completion_date is null or notice_to_proceed is null
           or actual_completion_date >= notice_to_proceed)
);

create index projects_agency_id_idx       on public.projects (agency_id);
create index projects_contractor_id_idx   on public.projects (contractor_id);
create index projects_muni_barangay_idx   on public.projects (municipality_id, barangay_id);
create index projects_created_by_idx      on public.projects (created_by);
create index projects_published_by_idx    on public.projects (published_by);
create index projects_flag_status_idx     on public.projects (municipality_id, effective_flag, completion_status);
create index projects_published_idx       on public.projects (is_published) where deleted_at is null;

-- Target completion date defaults to NTP + duration - 1 (inclusive count of
-- calendar days) and follows NTP/duration changes unless set explicitly.
create or replace function public.projects_derive_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.notice_to_proceed is not null and (
       tg_op = 'INSERT' and new.target_completion_date is null
    or tg_op = 'UPDATE'
       and new.target_completion_date is not distinct from old.target_completion_date
       and (new.notice_to_proceed is distinct from old.notice_to_proceed
            or new.duration_days  is distinct from old.duration_days)
  ) then
    new.target_completion_date := new.notice_to_proceed + new.duration_days - 1;
  end if;
  return new;
end $$;

create trigger trg_projects_dates before insert or update on public.projects
  for each row execute function public.projects_derive_dates();
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- System settings (flag thresholds etc. – seeded in 004)
-- ---------------------------------------------------------------------------
create table public.system_settings (
  key           text primary key,
  numeric_value numeric,
  text_value    text,
  description   text,
  updated_by    uuid references public.profiles (id) default auth.uid(),
  updated_at    timestamptz not null default now()
);
create index system_settings_updated_by_idx on public.system_settings (updated_by);
create trigger trg_settings_updated before update on public.system_settings
  for each row execute function public.set_updated_at();

create or replace function public.setting_num(p_key text, p_default numeric)
returns numeric
language sql stable
set search_path = ''
as $$
  select coalesce((select numeric_value from public.system_settings where key = p_key), p_default);
$$;

-- RLS on (policies in 005). The ensure_rls event trigger also does this.
alter table public.implementing_agencies enable row level security;
alter table public.profiles              enable row level security;
alter table public.municipalities        enable row level security;
alter table public.barangays             enable row level security;
alter table public.contractors           enable row level security;
alter table public.projects              enable row level security;
alter table public.system_settings       enable row level security;
