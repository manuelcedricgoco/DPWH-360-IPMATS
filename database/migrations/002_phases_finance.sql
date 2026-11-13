-- =============================================================================
-- DPWH 360° – 002_phases_finance.sql
-- Phase 2: construction phases (weighted), progress-update history and the
-- financial records (variation orders, obligations, disbursements, expenses).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Phase templates per project type (illustrative weights, editable by admin)
-- ---------------------------------------------------------------------------
create table public.phase_templates (
  template_id    smallint generated always as identity primary key,
  project_type   public.project_type not null,
  sequence       smallint not null check (sequence > 0),
  name           text not null,
  default_weight numeric(5,2) not null check (default_weight > 0 and default_weight <= 100),
  unique (project_type, sequence)
);

insert into public.phase_templates (project_type, sequence, name, default_weight) values
  ('road', 1, 'Site Preparation',          10),
  ('road', 2, 'Earthworks',                20),
  ('road', 3, 'Drainage Construction',     20),
  ('road', 4, 'Road Concreting',           35),
  ('road', 5, 'Finishing and Inspection',  15),
  ('bridge', 1, 'Site Preparation and Mobilization', 10),
  ('bridge', 2, 'Substructure (Piles, Abutments, Piers)', 35),
  ('bridge', 3, 'Superstructure (Girders and Deck Slab)', 30),
  ('bridge', 4, 'Approaches and Railings',  15),
  ('bridge', 5, 'Finishing and Inspection', 10),
  ('flood_control', 1, 'Site Preparation and Diversion', 10),
  ('flood_control', 2, 'Excavation and Foundation',      25),
  ('flood_control', 3, 'Revetment / Dike Construction',  40),
  ('flood_control', 4, 'Slope Protection and Drainage',  15),
  ('flood_control', 5, 'Finishing and Inspection',       10);

-- ---------------------------------------------------------------------------
-- Project phases
-- ---------------------------------------------------------------------------
create table public.project_phases (
  phase_id           uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (project_id) on delete cascade,
  sequence           smallint not null check (sequence > 0),
  name               text not null check (length(trim(name)) > 0),
  weight_pct         numeric(5,2) not null check (weight_pct > 0 and weight_pct <= 100),
  planned_start      date,
  planned_end        date,
  actual_start       date,
  actual_end         date,
  accomplishment_pct numeric(5,2) not null default 0 check (accomplishment_pct between 0 and 100),
  allocated_amount   numeric(15,2) check (allocated_amount is null or allocated_amount >= 0),
  remarks            text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (project_id, sequence),
  unique (project_id, phase_id),                 -- target of composite FKs
  check (planned_end is null or planned_start is null or planned_end >= planned_start),
  check (actual_end  is null or actual_start  is null or actual_end  >= actual_start)
);
create trigger trg_phases_updated before update on public.project_phases
  for each row execute function public.set_updated_at();

-- Phase weights of a project must total exactly 100% (checked at commit, so a
-- set of phases can be edited inside one transaction).
create or replace function public.check_phase_weights()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_project uuid := coalesce(new.project_id, old.project_id);
  v_total   numeric;
  v_count   int;
begin
  select coalesce(sum(weight_pct), 0), count(*) into v_total, v_count
  from public.project_phases where project_id = v_project;

  if v_count > 0 and v_total <> 100 then
    raise exception 'Phase weights for project % must total 100%% (currently %)', v_project, v_total
      using errcode = '23514';
  end if;
  return null;
end $$;

create constraint trigger trg_phase_weights_total
  after insert or update of weight_pct, project_id or delete on public.project_phases
  deferrable initially deferred
  for each row execute function public.check_phase_weights();

-- Creates phases from the template for the project type. Planned dates split
-- NTP..target proportionally to the phase weights (sequential schedule).
create or replace function public.create_project_phases_from_template(p_project_id uuid)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_proj  public.projects;
  v_total int;
  v_count int;
begin
  -- Callable by staff writers (or the service role / triggers, where auth.uid() is null).
  if auth.uid() is not null and not public.has_role('administrator', 'dpwh_personnel') then
    raise exception 'Only administrators or DPWH personnel can create project phases' using errcode = '42501';
  end if;
  select * into v_proj from public.projects where project_id = p_project_id;
  if not found then
    raise exception 'Project % not found', p_project_id using errcode = 'P0002';
  end if;
  if exists (select 1 from public.project_phases where project_id = p_project_id) then
    return 0;
  end if;

  v_total := case when v_proj.notice_to_proceed is not null and v_proj.target_completion_date is not null
                  then v_proj.target_completion_date - v_proj.notice_to_proceed + 1 end;

  insert into public.project_phases (project_id, sequence, name, weight_pct, planned_start, planned_end)
  select p_project_id, t.sequence, t.name, t.default_weight,
         case when v_total is not null then
           v_proj.notice_to_proceed + floor(v_total * (t.cum - t.default_weight) / 100)::int end,
         case when v_total is not null then
           least(v_proj.notice_to_proceed + ceil(v_total * t.cum / 100)::int - 1,
                 v_proj.target_completion_date) end
  from (
    select pt.*, sum(pt.default_weight) over (order by pt.sequence) as cum
    from public.phase_templates pt
    where pt.project_type = v_proj.project_type
  ) t
  order by t.sequence;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function public.projects_after_insert_phases()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.create_project_phases_from_template(new.project_id);
  return null;
end $$;

create trigger trg_projects_create_phases after insert on public.projects
  for each row execute function public.projects_after_insert_phases();

-- When the NTP is revised, shift the planned phase schedule by the same number
-- of days (or create it, if the project had no NTP before).
create or replace function public.projects_shift_phase_dates()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_delta int := new.notice_to_proceed - old.notice_to_proceed;
  v_total int;
begin
  if new.notice_to_proceed is null then
    return null;
  end if;
  if old.notice_to_proceed is not null then
    update public.project_phases
       set planned_start = planned_start + v_delta,
           planned_end   = planned_end   + v_delta
     where project_id = new.project_id;
  elsif new.target_completion_date is not null then
    v_total := new.target_completion_date - new.notice_to_proceed + 1;
    update public.project_phases f
       set planned_start = new.notice_to_proceed + floor(v_total * (c.cum - f.weight_pct) / 100)::int,
           planned_end   = least(new.notice_to_proceed + ceil(v_total * c.cum / 100)::int - 1,
                                 new.target_completion_date)
      from (select phase_id, sum(weight_pct) over (order by sequence) as cum
              from public.project_phases where project_id = new.project_id) c
     where f.phase_id = c.phase_id and f.planned_start is null;
  end if;
  return null;
end $$;

create trigger trg_projects_shift_phases after update of notice_to_proceed on public.projects
  for each row when (old.notice_to_proceed is distinct from new.notice_to_proceed)
  execute function public.projects_shift_phase_dates();

-- ---------------------------------------------------------------------------
-- Progress updates (immutable history; drives phase accomplishment)
-- ---------------------------------------------------------------------------
create table public.progress_updates (
  update_id    uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (project_id) on delete cascade,
  phase_id     uuid not null,
  reported_pct numeric(5,2) not null check (reported_pct between 0 and 100),
  report_date  date not null default current_date,
  narrative    text,
  submitted_by uuid references public.profiles (id) default auth.uid(),
  created_at   timestamptz not null default now(),
  constraint progress_updates_phase_fk foreign key (project_id, phase_id)
    references public.project_phases (project_id, phase_id) on delete cascade
);
create index progress_updates_phase_idx     on public.progress_updates (project_id, phase_id, report_date desc);
create index progress_updates_submitted_idx on public.progress_updates (submitted_by);

create or replace function public.apply_progress_update()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  -- Only the latest report (by report_date) sets the phase accomplishment.
  if not exists (
    select 1 from public.progress_updates
    where phase_id = new.phase_id and report_date > new.report_date
  ) then
    update public.project_phases
       set accomplishment_pct = new.reported_pct,
           actual_start = coalesce(actual_start, case when new.reported_pct > 0 then new.report_date end),
           actual_end   = case when new.reported_pct = 100 then coalesce(actual_end, new.report_date) end
     where phase_id = new.phase_id;
  end if;
  return null;
end $$;

create trigger trg_progress_apply after insert on public.progress_updates
  for each row execute function public.apply_progress_update();

-- ---------------------------------------------------------------------------
-- Financial records
-- (document_id FKs to project_documents are added in 003)
-- ---------------------------------------------------------------------------
create type public.variation_status as enum ('pending', 'approved', 'rejected');

create table public.variation_orders (
  vo_id         uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (project_id) on delete cascade,
  vo_number     text not null,
  description   text,
  amount        numeric(15,2) not null check (amount <> 0),   -- negative = deductive VO
  time_ext_days integer not null default 0 check (time_ext_days >= 0),
  status        public.variation_status not null default 'pending',
  approved_date date,
  document_id   uuid,
  recorded_by   uuid references public.profiles (id) default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (project_id, vo_number),
  check (status <> 'approved' or approved_date is not null)
);

create table public.financial_obligations (
  obligation_id   uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (project_id) on delete cascade,
  reference_no    text,                       -- e.g. ORS / BURS number
  obligation_date date not null,
  amount          numeric(15,2) not null check (amount > 0),
  description     text,
  document_id     uuid,
  recorded_by     uuid references public.profiles (id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.disbursements (
  disbursement_id   uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (project_id) on delete cascade,
  reference_no      text,                     -- e.g. DV / check number
  disbursement_date date not null,
  amount            numeric(15,2) not null check (amount > 0),
  billing_type      text not null default 'progress_billing'
                    check (billing_type in ('advance_payment', 'progress_billing',
                                            'final_billing', 'retention_release', 'other')),
  description       text,
  document_id       uuid,
  recorded_by       uuid references public.profiles (id) default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.reported_expenses (
  expense_id   uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (project_id) on delete cascade,
  phase_id     uuid,
  expense_date date not null,
  category     text not null default 'other'
               check (category in ('materials', 'labor', 'equipment', 'overhead', 'other')),
  amount       numeric(15,2) not null check (amount > 0),
  description  text,
  document_id  uuid,
  recorded_by  uuid references public.profiles (id) default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint reported_expenses_phase_fk foreign key (project_id, phase_id)
    references public.project_phases (project_id, phase_id) on delete set null (phase_id)
);

create index variation_orders_project_idx  on public.variation_orders (project_id);
create index variation_orders_recorded_idx on public.variation_orders (recorded_by);
create index obligations_project_idx       on public.financial_obligations (project_id);
create index obligations_recorded_idx      on public.financial_obligations (recorded_by);
create index disbursements_project_idx     on public.disbursements (project_id, disbursement_date);
create index disbursements_recorded_idx    on public.disbursements (recorded_by);
create index expenses_project_phase_idx    on public.reported_expenses (project_id, phase_id);
create index expenses_recorded_idx         on public.reported_expenses (recorded_by);

create trigger trg_vo_updated          before update on public.variation_orders      for each row execute function public.set_updated_at();
create trigger trg_obligations_updated before update on public.financial_obligations for each row execute function public.set_updated_at();
create trigger trg_disb_updated        before update on public.disbursements         for each row execute function public.set_updated_at();
create trigger trg_expenses_updated    before update on public.reported_expenses     for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Progress computations
-- ---------------------------------------------------------------------------
-- Overall physical accomplishment = Σ(weight × phase accomplishment) / 100.
create or replace function public.compute_overall_progress(p_project_id uuid)
returns numeric
language sql stable
set search_path = ''
as $$
  select round(coalesce(sum(weight_pct * accomplishment_pct) / 100, 0), 2)
  from public.project_phases where project_id = p_project_id;
$$;

-- Planned accomplishment as of a date: each phase contributes its weight
-- linearly between planned_start and planned_end. Phases without planned dates
-- fall back to a straight line from NTP to the target completion date.
create or replace function public.compute_planned_progress(p_project_id uuid, p_as_of date default current_date)
returns numeric
language sql stable
set search_path = ''
as $$
  with p as (
    select notice_to_proceed as s, target_completion_date as e
    from public.projects where project_id = p_project_id
  ),
  ph as (
    select f.weight_pct,
           coalesce(f.planned_start, p.s) as s,
           coalesce(f.planned_end,   p.e) as e
    from public.project_phases f cross join p
    where f.project_id = p_project_id
  )
  select round(least(100, coalesce(
           case when exists (select 1 from ph)
             then (select sum(weight_pct *
                     case when s is null or e is null then 0
                          when p_as_of <  s then 0
                          when p_as_of >= e then 1
                          else (p_as_of - s + 1)::numeric / (e - s + 1) end)
                   from ph)
             else (select case when s is null or e is null then 0
                               when p_as_of <  s then 0
                               when p_as_of >= e then 100
                               else 100 * (p_as_of - s + 1)::numeric / (e - s + 1) end
                   from p)
           end, 0)), 2);
$$;

alter table public.phase_templates       enable row level security;
alter table public.project_phases        enable row level security;
alter table public.progress_updates      enable row level security;
alter table public.variation_orders      enable row level security;
alter table public.financial_obligations enable row level security;
alter table public.disbursements         enable row level security;
alter table public.reported_expenses     enable row level security;
