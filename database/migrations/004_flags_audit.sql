-- =============================================================================
-- DPWH 360° – 004_flags_audit.sql
-- Phase 4: automatic completion + flag detection engine, auditor flag reviews,
-- audit findings / evidence / corrective actions, insert-only activity log and
-- the daily pg_cron re-check.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Configurable thresholds (illustrative; base them on DPWH guidelines)
-- ---------------------------------------------------------------------------
insert into public.system_settings (key, numeric_value, description) values
  ('slippage_yellow_pct', 5,    'Schedule slippage (planned% - actual%) above this is YELLOW'),
  ('slippage_red_pct',    15,   'Schedule slippage above this is RED'),
  ('image_stale_days',    30,   'Latest 360° image older than this many days (ongoing projects) is YELLOW'),
  ('gps_tolerance_m',     500,  'Image GPS farther than this from the project coordinates is YELLOW'),
  ('gps_red_m',           2000, 'Image GPS farther than this from the project coordinates is RED'),
  ('fin_gap_yellow_pct',  10,   'Financial% - physical% above this is YELLOW'),
  ('fin_gap_red_pct',     20,   'Financial% - physical% above this is RED')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Project audit status (set by auditors)
-- ---------------------------------------------------------------------------
alter table public.projects
  add column audit_status text not null default 'not_audited'
    check (audit_status in ('not_audited', 'under_review', 'audited', 'for_investigation', 'cleared'));

-- ---------------------------------------------------------------------------
-- Evaluation history
-- ---------------------------------------------------------------------------
create table public.flag_evaluations (
  evaluation_id      uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (project_id) on delete cascade,
  source             text not null check (source in ('upload', 'daily', 'manual')),
  auto_flag          public.flag_color not null,
  previous_flag      public.flag_color,
  completion_status  public.completion_status not null,
  overall_progress   numeric(5,2) not null,
  planned_progress   numeric(5,2) not null,
  financial_progress numeric(6,2) not null,
  reasons            jsonb not null default '[]'::jsonb,
  evaluated_at       timestamptz not null default now()
);
create index flag_evaluations_project_idx on public.flag_evaluations (project_id, evaluated_at desc);

-- ---------------------------------------------------------------------------
-- The engine
-- ---------------------------------------------------------------------------
-- Severity ranks: 0 = green, 1 = yellow, 2 = red. 'info' reasons don't affect
-- the flag. Reasons: [{check, severity, message, value}]
create or replace function public.evaluate_project(p_project_id uuid, p_source text default 'manual')
returns public.flag_color
language plpgsql security definer
set search_path = ''
as $$
declare
  p              public.projects;
  v_today        date := (now() at time zone 'Asia/Manila')::date;
  v_rank         int  := 0;
  v_reasons      jsonb := '[]'::jsonb;
  v_flag         public.flag_color;
  v_completion   public.completion_status;
  v_actual       numeric;
  v_planned      numeric;
  v_slip         numeric;
  v_ext_days     int;
  v_target       date;
  v_started      boolean;
  v_has_final    boolean;
  v_img_count    int;
  v_latest_img   date;
  v_reused       int;
  v_far_red      int;
  v_far_yellow   int;
  v_no_gps       int;
  v_contract     numeric;
  v_vo           numeric;
  v_revised      numeric;
  v_disb         numeric;
  v_fin_pct      numeric;
  v_gap          numeric;
  v_review_flag  public.flag_color;
  v_review_auto  public.flag_color;
  -- thresholds
  t_slip_y numeric := public.setting_num('slippage_yellow_pct', 5);
  t_slip_r numeric := public.setting_num('slippage_red_pct', 15);
  t_stale  numeric := public.setting_num('image_stale_days', 30);
  t_gps_y  numeric := public.setting_num('gps_tolerance_m', 500);
  t_gps_r  numeric := public.setting_num('gps_red_m', 2000);
  t_fin_y  numeric := public.setting_num('fin_gap_yellow_pct', 10);
  t_fin_r  numeric := public.setting_num('fin_gap_red_pct', 20);
begin
  select * into p from public.projects where project_id = p_project_id for update;
  if not found or p.deleted_at is not null then
    return null;
  end if;

  -- ---------- gather facts ----------
  v_actual  := public.compute_overall_progress(p_project_id);
  v_planned := public.compute_planned_progress(p_project_id, v_today);

  select coalesce(sum(time_ext_days), 0), coalesce(sum(amount), 0)
    into v_ext_days, v_vo
  from public.variation_orders where project_id = p_project_id and status = 'approved';

  v_target  := p.target_completion_date + v_ext_days;
  v_started := p.notice_to_proceed is not null and v_today >= p.notice_to_proceed;

  select count(*),
         max(inspection_date),
         count(*) filter (where is_reused),
         count(*) filter (where distance_from_site_m > t_gps_r),
         count(*) filter (where distance_from_site_m > t_gps_y and distance_from_site_m <= t_gps_r),
         count(*) filter (where gps_lat is null or gps_lng is null),
         coalesce(bool_or(is_final), false)
    into v_img_count, v_latest_img, v_reused, v_far_red, v_far_yellow, v_no_gps, v_has_final
  from public.site_images where project_id = p_project_id;

  v_contract := coalesce(p.contract_amount, p.approved_budget);
  v_revised  := v_contract + v_vo;
  select coalesce(sum(amount), 0) into v_disb from public.disbursements where project_id = p_project_id;
  v_fin_pct  := case when v_revised > 0 then round(v_disb * 100 / v_revised, 2) else 0 end;

  -- ---------- 1. completion check ----------
  if v_actual >= 100 and p.actual_completion_date is not null and v_has_final then
    v_completion := 'completed';
    if v_target is not null and p.actual_completion_date > v_target then
      v_reasons := v_reasons || jsonb_build_object('check', 'completion', 'severity', 'info',
        'message', format('Completed %s day(s) after the target date', p.actual_completion_date - v_target),
        'value', p.actual_completion_date - v_target);
    end if;
  elsif v_actual >= 100 then
    v_rank := greatest(v_rank, 1);
    v_reasons := v_reasons || jsonb_build_object('check', 'completion', 'severity', 'yellow',
      'message', 'All phases report 100% but ' ||
        concat_ws(' and ',
          case when p.actual_completion_date is null then 'no actual completion date is recorded' end,
          case when not v_has_final then 'no final 360° image is uploaded' end),
      'value', v_actual);
  end if;

  -- ---------- 2. schedule check ----------
  v_slip := round(v_planned - v_actual, 2);
  if v_completion is null then
    if p.status = 'cancelled' then
      v_reasons := v_reasons || jsonb_build_object('check', 'schedule', 'severity', 'info',
        'message', 'Project is cancelled', 'value', null);
    elsif p.status = 'suspended' then
      v_rank := greatest(v_rank, 1);
      v_reasons := v_reasons || jsonb_build_object('check', 'schedule', 'severity', 'yellow',
        'message', 'Project is suspended', 'value', null);
    elsif v_target is not null and v_today > v_target then
      v_rank := 2;
      v_reasons := v_reasons || jsonb_build_object('check', 'schedule', 'severity', 'red',
        'message', format('Target completion date %s passed %s day(s) ago without completion',
                          v_target, v_today - v_target),
        'value', v_today - v_target);
    elsif v_started and v_slip > t_slip_r then
      v_rank := 2;
      v_reasons := v_reasons || jsonb_build_object('check', 'schedule', 'severity', 'red',
        'message', format('Slippage of %s%% (planned %s%%, actual %s%%)', v_slip, v_planned, v_actual),
        'value', v_slip);
    elsif v_started and v_slip > t_slip_y then
      v_rank := greatest(v_rank, 1);
      v_reasons := v_reasons || jsonb_build_object('check', 'schedule', 'severity', 'yellow',
        'message', format('Slippage of %s%% (planned %s%%, actual %s%%)', v_slip, v_planned, v_actual),
        'value', v_slip);
    end if;

    v_completion := case
      when not v_started and v_actual = 0                   then 'not_started'
      when v_target is not null and v_today > v_target      then 'delayed'
      when v_started and v_slip > t_slip_y                  then 'delayed'
      else 'ongoing' end::public.completion_status;
  end if;

  -- ---------- 3. documentation check ----------
  if v_started or v_actual > 0 then
    if v_img_count = 0 then
      v_rank := greatest(v_rank, 1);
      v_reasons := v_reasons || jsonb_build_object('check', 'documentation', 'severity', 'yellow',
        'message', 'No 360° image has been uploaded', 'value', 0);
    elsif v_completion <> 'completed' and p.status = 'active'
          and v_latest_img < v_today - t_stale::int then
      v_rank := greatest(v_rank, 1);
      v_reasons := v_reasons || jsonb_build_object('check', 'documentation', 'severity', 'yellow',
        'message', format('Latest 360° image is %s day(s) old (inspection %s)', v_today - v_latest_img, v_latest_img),
        'value', v_today - v_latest_img);
    end if;
  end if;
  if v_reused > 0 then
    v_rank := 2;
    v_reasons := v_reasons || jsonb_build_object('check', 'documentation', 'severity', 'red',
      'message', format('%s reused/duplicate image(s) detected', v_reused), 'value', v_reused);
  end if;
  if v_far_red > 0 then
    v_rank := 2;
    v_reasons := v_reasons || jsonb_build_object('check', 'documentation', 'severity', 'red',
      'message', format('%s image(s) taken more than %s m from the project site', v_far_red, t_gps_r),
      'value', v_far_red);
  end if;
  if v_far_yellow > 0 then
    v_rank := greatest(v_rank, 1);
    v_reasons := v_reasons || jsonb_build_object('check', 'documentation', 'severity', 'yellow',
      'message', format('%s image(s) taken %s–%s m from the project site', v_far_yellow, t_gps_y, t_gps_r),
      'value', v_far_yellow);
  end if;
  if v_no_gps > 0 then
    v_rank := greatest(v_rank, 1);
    v_reasons := v_reasons || jsonb_build_object('check', 'documentation', 'severity', 'yellow',
      'message', format('%s image(s) have no GPS coordinates', v_no_gps), 'value', v_no_gps);
  end if;

  -- ---------- 4. financial check ----------
  if v_disb > v_revised then
    v_rank := 2;
    v_reasons := v_reasons || jsonb_build_object('check', 'financial', 'severity', 'red',
      'message', format('Disbursements (%s) exceed the contract amount plus approved variation orders (%s)',
                        to_char(v_disb, 'FM999,999,999,990.00'), to_char(v_revised, 'FM999,999,999,990.00')),
      'value', v_disb - v_revised);
  end if;
  v_gap := round(v_fin_pct - v_actual, 2);
  if v_gap > t_fin_r then
    v_rank := 2;
    v_reasons := v_reasons || jsonb_build_object('check', 'financial', 'severity', 'red',
      'message', format('Financial progress %s%% is %s points ahead of physical progress %s%%', v_fin_pct, v_gap, v_actual),
      'value', v_gap);
  elsif v_gap > t_fin_y then
    v_rank := greatest(v_rank, 1);
    v_reasons := v_reasons || jsonb_build_object('check', 'financial', 'severity', 'yellow',
      'message', format('Financial progress %s%% is %s points ahead of physical progress %s%%', v_fin_pct, v_gap, v_actual),
      'value', v_gap);
  end if;

  v_flag := (array['green', 'yellow', 'red']::public.flag_color[])[v_rank + 1];

  -- ---------- effective flag: an auditor review stays in force until the auto flag changes ----------
  select r.flag, r.auto_flag_at_review into v_review_flag, v_review_auto
  from public.flag_reviews r
  where r.project_id = p_project_id
  order by r.reviewed_at desc
  limit 1;

  -- ---------- write results ----------
  update public.projects set
    overall_progress   = v_actual,
    planned_progress   = v_planned,
    financial_progress = least(v_fin_pct, 9999),
    completion_status  = v_completion,
    auto_flag          = v_flag,
    effective_flag     = case when v_review_auto = v_flag then v_review_flag else v_flag end,
    flag_reasons       = v_reasons,
    last_evaluated_at  = now(),
    -- Yellow/red flags wait for an auditor until a review of that same auto flag exists.
    needs_review       = (v_flag <> 'green' and v_review_auto is distinct from v_flag)
  where project_id = p_project_id;

  if p_source = 'manual'
     or p.auto_flag         is distinct from v_flag
     or p.completion_status is distinct from v_completion
     or p.flag_reasons      is distinct from v_reasons then
    insert into public.flag_evaluations (project_id, source, auto_flag, previous_flag, completion_status,
                                         overall_progress, planned_progress, financial_progress, reasons)
    values (p_project_id, p_source, v_flag, p.auto_flag, v_completion,
            v_actual, v_planned, least(v_fin_pct, 9999), v_reasons);
  end if;

  return v_flag;
end $$;

create or replace function public.evaluate_all_projects(p_source text default 'daily')
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  r record;
  n int := 0;
begin
  for r in select project_id from public.projects where deleted_at is null loop
    perform public.evaluate_project(r.project_id, p_source);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Re-evaluate on every upload / change. Nested trigger calls are skipped (the
-- outermost trigger re-evaluates once), which also prevents recursion when the
-- engine updates projects.
create or replace function public.trg_reevaluate_project()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.project_id is distinct from
     (case when tg_op = 'UPDATE' then new.project_id end) then
    perform public.evaluate_project(old.project_id, 'upload');
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.evaluate_project(new.project_id, 'upload');
  end if;
  return null;
end $$;

-- "zz" prefix: fires after the other AFTER triggers of the same table.
create trigger trg_zz_reevaluate after insert or update or delete on public.project_phases
  for each row execute function public.trg_reevaluate_project();
create trigger trg_zz_reevaluate after insert or update or delete on public.progress_updates
  for each row execute function public.trg_reevaluate_project();
create trigger trg_zz_reevaluate after insert or update or delete on public.site_images
  for each row execute function public.trg_reevaluate_project();
create trigger trg_zz_reevaluate after insert or update or delete on public.disbursements
  for each row execute function public.trg_reevaluate_project();
create trigger trg_zz_reevaluate after insert or update or delete on public.variation_orders
  for each row execute function public.trg_reevaluate_project();
create trigger trg_zz_reevaluate
  after insert or update of notice_to_proceed, duration_days, target_completion_date,
                            actual_completion_date, contract_amount, approved_budget,
                            status, latitude, longitude, deleted_at
  on public.projects
  for each row execute function public.trg_reevaluate_project();

-- ---------------------------------------------------------------------------
-- Audit evidence, findings, corrective actions
-- ---------------------------------------------------------------------------
create table public.audit_findings (
  finding_id     uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (project_id) on delete cascade,
  phase_id       uuid,
  title          text not null check (length(trim(title)) > 0),
  description    text not null,
  severity       text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  recommendation text,
  status         text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  is_published   boolean not null default false,
  auditor_id     uuid references public.profiles (id) default auth.uid(),
  resolved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint audit_findings_phase_fk foreign key (project_id, phase_id)
    references public.project_phases (project_id, phase_id) on delete set null (phase_id)
);
create index audit_findings_project_idx on public.audit_findings (project_id, phase_id);
create index audit_findings_auditor_idx on public.audit_findings (auditor_id);
create trigger trg_findings_updated before update on public.audit_findings
  for each row execute function public.set_updated_at();

create table public.audit_evidence (
  evidence_id     uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (project_id) on delete cascade,
  finding_id      uuid references public.audit_findings (finding_id) on delete set null,
  storage_path    text not null unique,      -- object name in the audit-evidence bucket
  description     text,
  mime_type       text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  sha256          text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by     uuid references public.profiles (id) default auth.uid(),
  uploaded_at     timestamptz not null default now(),
  constraint audit_evidence_path_in_project_folder check (storage_path like project_id::text || '/%')
);
create index audit_evidence_project_idx  on public.audit_evidence (project_id);
create index audit_evidence_finding_idx  on public.audit_evidence (finding_id);
create index audit_evidence_uploader_idx on public.audit_evidence (uploaded_by);

create table public.corrective_actions (
  action_id   uuid primary key default gen_random_uuid(),
  finding_id  uuid not null references public.audit_findings (finding_id) on delete cascade,
  project_id  uuid not null references public.projects (project_id) on delete cascade,
  action      text not null check (length(trim(action)) > 0),
  assigned_to uuid references public.profiles (id),
  due_date    date,
  status      text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'verified')),
  remarks     text,
  created_by  uuid references public.profiles (id) default auth.uid(),
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index corrective_actions_finding_idx  on public.corrective_actions (finding_id);
create index corrective_actions_project_idx  on public.corrective_actions (project_id);
create index corrective_actions_assigned_idx on public.corrective_actions (assigned_to);
create index corrective_actions_created_idx  on public.corrective_actions (created_by);
create trigger trg_actions_updated before update on public.corrective_actions
  for each row execute function public.set_updated_at();

-- project_id of a corrective action must match its finding; only auditors verify.
create or replace function public.corrective_actions_guard()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select project_id into new.project_id from public.audit_findings where finding_id = new.finding_id;
  -- DPWH personnel (assignees) may only report progress: status + remarks.
  if tg_op = 'UPDATE' and auth.uid() is not null
     and not public.has_role('auditor', 'administrator')
     and (new.action, new.assigned_to, new.due_date, new.finding_id, new.created_by)
         is distinct from (old.action, old.assigned_to, old.due_date, old.finding_id, old.created_by) then
    raise exception 'Only auditors can change a corrective action other than its status and remarks'
      using errcode = '42501';
  end if;
  if new.status = 'verified' and (tg_op = 'INSERT' or old.status <> 'verified')
     and not public.has_role('auditor', 'administrator')
     and auth.uid() is not null then
    raise exception 'Only auditors can verify corrective actions' using errcode = '42501';
  end if;
  if new.status in ('done', 'verified') and new.resolved_at is null then
    new.resolved_at := now();
  end if;
  return new;
end $$;
create trigger trg_actions_guard before insert or update on public.corrective_actions
  for each row execute function public.corrective_actions_guard();

-- ---------------------------------------------------------------------------
-- Auditor flag reviews (confirm / override) – immutable
-- ---------------------------------------------------------------------------
create table public.flag_reviews (
  review_id           uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (project_id) on delete cascade,
  evaluation_id       uuid references public.flag_evaluations (evaluation_id) on delete set null,
  action              text not null check (action in ('confirm', 'override')),
  auto_flag_at_review public.flag_color not null,
  flag                public.flag_color not null,
  reason              text not null check (length(trim(reason)) >= 10),
  evidence_ids        uuid[] not null default '{}',
  reviewed_by         uuid references public.profiles (id) default auth.uid(),
  reviewed_at         timestamptz not null default now(),
  check (action <> 'confirm' or flag = auto_flag_at_review)
);
create index flag_reviews_project_idx    on public.flag_reviews (project_id, reviewed_at desc);
create index flag_reviews_evaluation_idx on public.flag_reviews (evaluation_id);
create index flag_reviews_reviewer_idx   on public.flag_reviews (reviewed_by);

create or replace function public.flag_reviews_before_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_auto public.flag_color;
  v_missing int;
begin
  select auto_flag into v_auto from public.projects where project_id = new.project_id;
  if v_auto is null then
    raise exception 'Project has not been evaluated yet' using errcode = '22023';
  end if;

  new.auto_flag_at_review := v_auto;
  new.reviewed_at := now();
  new.evaluation_id := coalesce(new.evaluation_id,
    (select evaluation_id from public.flag_evaluations
      where project_id = new.project_id order by evaluated_at desc limit 1));

  if new.action = 'confirm' then
    new.flag := v_auto;
  elsif new.flag = v_auto then
    new.action := 'confirm';
  else
    -- Overrides need at least one piece of evidence belonging to this project.
    if cardinality(new.evidence_ids) = 0 then
      raise exception 'A flag override requires supporting evidence (evidence_ids)' using errcode = '23514';
    end if;
  end if;

  if cardinality(new.evidence_ids) > 0 then
    select count(*) into v_missing
    from unnest(new.evidence_ids) e(id)
    where not exists (select 1 from public.audit_evidence ae
                      where ae.evidence_id = e.id and ae.project_id = new.project_id);
    if v_missing > 0 then
      raise exception '% evidence id(s) do not exist for this project', v_missing using errcode = '23503';
    end if;
  end if;
  return new;
end $$;

create or replace function public.flag_reviews_after_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.projects
     set effective_flag = new.flag,
         needs_review   = false
   where project_id = new.project_id;
  return null;
end $$;

create trigger trg_flag_reviews_before before insert on public.flag_reviews
  for each row execute function public.flag_reviews_before_insert();
create trigger trg_flag_reviews_after after insert on public.flag_reviews
  for each row execute function public.flag_reviews_after_insert();

-- ---------------------------------------------------------------------------
-- Activity log (insert-only)
-- ---------------------------------------------------------------------------
create table public.activity_logs (
  log_id     bigint generated always as identity primary key,
  actor_id   uuid default auth.uid(),
  actor_role public.user_role,
  action     text not null,
  table_name text,
  record_id  text,
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()
);
create index activity_logs_table_record_idx on public.activity_logs (table_name, record_id);
create index activity_logs_actor_idx        on public.activity_logs (actor_id, created_at desc);
create index activity_logs_created_idx      on public.activity_logs (created_at desc);

create or replace function public.activity_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'activity_logs is insert-only' using errcode = '42501';
end $$;
create trigger trg_activity_logs_immutable before update or delete on public.activity_logs
  for each row execute function public.activity_logs_immutable();
create trigger trg_activity_logs_no_truncate before truncate on public.activity_logs
  for each statement execute function public.activity_logs_immutable();

-- Generic row logger. Engine-only changes (computed columns) are not logged –
-- they are recorded in flag_evaluations instead.
create or replace function public.log_activity()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_sys text[] := array['updated_at', 'last_evaluated_at', 'overall_progress', 'planned_progress',
                        'financial_progress', 'completion_status', 'auto_flag', 'effective_flag',
                        'flag_reasons', 'needs_review', 'distance_from_site_m'];
  v_pk  text := tg_argv[0];
begin
  if tg_op = 'UPDATE' and (v_old - v_sys) = (v_new - v_sys) then
    return null;
  end if;
  insert into public.activity_logs (actor_id, actor_role, action, table_name, record_id, old_data, new_data)
  values (auth.uid(), public.current_user_role(), tg_op, tg_table_name,
          coalesce(v_new ->> v_pk, v_old ->> v_pk), v_old, v_new);
  return null;
end $$;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('profiles', 'id'), ('implementing_agencies', 'agency_id'), ('contractors', 'contractor_id'),
      ('barangays', 'barangay_id'), ('projects', 'project_id'), ('system_settings', 'key'),
      ('phase_templates', 'template_id'), ('project_phases', 'phase_id'),
      ('progress_updates', 'update_id'), ('variation_orders', 'vo_id'),
      ('financial_obligations', 'obligation_id'), ('disbursements', 'disbursement_id'),
      ('reported_expenses', 'expense_id'), ('site_images', 'image_id'),
      ('project_documents', 'document_id'), ('flag_reviews', 'review_id'),
      ('audit_findings', 'finding_id'), ('audit_evidence', 'evidence_id'),
      ('corrective_actions', 'action_id')
    ) v(tbl, pk)
  loop
    execute format(
      'create trigger trg_log_activity after insert or update or delete on public.%I
         for each row execute function public.log_activity(%L)', t.tbl, t.pk);
  end loop;
end $$;

-- App-level events (login, report generated, export ...) logged from the client/server.
create or replace function public.log_event(p_action text, p_table text default null,
                                            p_record_id text default null, p_details jsonb default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Must be signed in' using errcode = '42501';
  end if;
  if p_action is null or length(p_action) > 64 then
    raise exception 'Invalid action' using errcode = '22023';
  end if;
  insert into public.activity_logs (actor_id, actor_role, action, table_name, record_id, new_data)
  values (auth.uid(), public.current_user_role(), upper(p_action), p_table, p_record_id, p_details);
end $$;

alter table public.flag_evaluations   enable row level security;
alter table public.flag_reviews       enable row level security;
alter table public.audit_findings     enable row level security;
alter table public.audit_evidence     enable row level security;
alter table public.corrective_actions enable row level security;
alter table public.activity_logs      enable row level security;

-- ---------------------------------------------------------------------------
-- Daily re-check at 00:05 Asia/Manila (= 16:05 UTC)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'dpwh360-daily-flag-check') then
    perform cron.unschedule('dpwh360-daily-flag-check');
  end if;
  perform cron.schedule('dpwh360-daily-flag-check', '5 16 * * *',
                        $job$select public.evaluate_all_projects('daily')$job$);
end $$;
