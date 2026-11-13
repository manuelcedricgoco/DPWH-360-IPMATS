-- =============================================================================
-- DPWH 360° – 005_rls_views.sql
-- Phase 5: grants, Row Level Security policies, API views and client RPCs.
--
-- Model: the React app uses the anon key; the Node server uses the service
-- key (server only). Table grants say WHAT an API role may do at all; RLS
-- policies say WHICH rows. Computed / disclosure / audit columns are never
-- granted for writing – they change only through SECURITY DEFINER functions.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Start from zero privileges
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Future tables created by postgres must not hand out TRUNCATE/TRIGGER/etc.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;

-- The Node server (service_role, bypasses RLS) gets full access.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables    in schema public to service_role;
grant usage, select                  on all sequences in schema public to service_role;
grant execute                        on all functions in schema public to service_role;
grant usage, select                  on all sequences in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Visibility helper
-- ---------------------------------------------------------------------------
create or replace function public.can_view_project(p_project_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_staff() or exists (
    select 1 from public.projects
    where project_id = p_project_id and is_published and deleted_at is null
  );
$$;

-- Functions used inside policies/views must be executable by the API roles.
grant execute on function
  public.has_role(variadic public.user_role[]),
  public.is_staff(),
  public.current_user_role(),
  public.can_view_project(uuid),
  public.storage_project_exists(text),
  public.public_can_view_image(text),
  public.public_can_view_document(text),
  public.distance_m(numeric, numeric, numeric, numeric),
  public.compute_overall_progress(uuid),
  public.compute_planned_progress(uuid, date),
  public.setting_num(text, numeric)
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Table grants
-- ---------------------------------------------------------------------------
-- Readable by everyone (rows still filtered by RLS)
grant select on public.municipalities, public.barangays, public.implementing_agencies,
                public.contractors, public.projects, public.phase_templates,
                public.project_phases, public.progress_updates, public.site_images,
                public.project_documents, public.audit_findings
  to anon, authenticated;

-- Readable by signed-in users only (RLS limits to staff / own rows)
grant select on public.profiles, public.system_settings, public.variation_orders,
                public.financial_obligations, public.disbursements, public.reported_expenses,
                public.flag_evaluations, public.flag_reviews, public.audit_evidence,
                public.corrective_actions, public.activity_logs
  to authenticated;

-- profiles: users may edit only their own name/office; roles go through admin_set_user_access()
grant update (full_name, office) on public.profiles to authenticated;

-- lookups
grant insert, update, delete on public.implementing_agencies, public.contractors,
                                public.barangays, public.phase_templates
  to authenticated;
grant insert, update on public.system_settings to authenticated;

-- projects: no computed, disclosure or audit columns
grant insert (project_id, project_code, contract_reference_no, name, description, project_type,
              agency_id, contractor_id, approved_budget, contract_amount, municipality_id,
              barangay_id, latitude, longitude, notice_to_proceed, duration_days,
              target_completion_date, actual_completion_date, status)
  on public.projects to authenticated;
grant update (project_code, contract_reference_no, name, description, project_type,
              agency_id, contractor_id, approved_budget, contract_amount, municipality_id,
              barangay_id, latitude, longitude, notice_to_proceed, duration_days,
              target_completion_date, actual_completion_date, status, deleted_at)
  on public.projects to authenticated;
grant delete on public.projects to authenticated;

-- phases: accomplishment only changes through progress_updates
grant insert (phase_id, project_id, sequence, name, weight_pct, planned_start, planned_end,
              allocated_amount, remarks)
  on public.project_phases to authenticated;
grant update (sequence, name, weight_pct, planned_start, planned_end, actual_start, actual_end,
              allocated_amount, remarks)
  on public.project_phases to authenticated;
grant delete on public.project_phases to authenticated;

-- progress history is append-only
grant insert (update_id, project_id, phase_id, reported_pct, report_date, narrative)
  on public.progress_updates to authenticated;

-- finance
grant insert, update, delete on public.variation_orders, public.financial_obligations,
                                public.disbursements, public.reported_expenses
  to authenticated;

-- images / documents: disclosure via set_disclosure(); computed columns never writable
grant insert (image_id, project_id, phase_id, storage_path, mime_type, file_size_bytes, sha256,
              captured_at, inspection_date, gps_lat, gps_lng, is_final, caption)
  on public.site_images to authenticated;
grant update (phase_id, caption, inspection_date, is_final) on public.site_images to authenticated;
grant delete on public.site_images to authenticated;

grant insert (document_id, project_id, doc_type, title, storage_path, mime_type, file_size_bytes, sha256)
  on public.project_documents to authenticated;
grant update (doc_type, title) on public.project_documents to authenticated;
grant delete on public.project_documents to authenticated;

-- audit
grant insert (project_id, evaluation_id, action, flag, reason, evidence_ids)
  on public.flag_reviews to authenticated;
grant insert, update on public.audit_findings to authenticated;
grant insert (evidence_id, project_id, finding_id, storage_path, description, mime_type,
              file_size_bytes, sha256)
  on public.audit_evidence to authenticated;
grant insert, update on public.corrective_actions to authenticated;
-- activity_logs: no insert/update/delete for anyone (written by triggers / log_event()).

-- ---------------------------------------------------------------------------
-- 3. RLS policies
-- ---------------------------------------------------------------------------
-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_staff());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- public lookups
create policy municipalities_read on public.municipalities for select to anon, authenticated using (true);
create policy barangays_read      on public.barangays      for select to anon, authenticated using (true);
create policy agencies_read       on public.implementing_agencies for select to anon, authenticated using (true);
create policy contractors_read    on public.contractors    for select to anon, authenticated using (true);
create policy templates_read      on public.phase_templates for select to anon, authenticated using (true);

create policy barangays_write on public.barangays for all to authenticated
  using (public.has_role('administrator', 'dpwh_personnel'))
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy agencies_write on public.implementing_agencies for all to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));
create policy contractors_insert on public.contractors for insert to authenticated
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy contractors_update on public.contractors for update to authenticated
  using (public.has_role('administrator', 'dpwh_personnel'))
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy contractors_delete on public.contractors for delete to authenticated
  using (public.has_role('administrator'));
create policy templates_write on public.phase_templates for all to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));

-- system settings
create policy settings_read on public.system_settings for select to authenticated
  using (public.is_staff());
create policy settings_insert on public.system_settings for insert to authenticated
  with check (public.has_role('administrator'));
create policy settings_update on public.system_settings for update to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));

-- projects
create policy projects_read on public.projects for select to anon, authenticated
  using ((deleted_at is null and (is_published or public.is_staff()))
         or public.has_role('administrator'));
create policy projects_insert on public.projects for insert to authenticated
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy projects_update on public.projects for update to authenticated
  using (public.has_role('administrator')
         or (public.has_role('dpwh_personnel') and deleted_at is null))
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy projects_delete on public.projects for delete to authenticated
  using (public.has_role('administrator'));

-- phases / progress (public sees them for published projects)
create policy phases_read on public.project_phases for select to anon, authenticated
  using (public.can_view_project(project_id));
create policy phases_insert on public.project_phases for insert to authenticated
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy phases_update on public.project_phases for update to authenticated
  using (public.has_role('administrator', 'dpwh_personnel'))
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy phases_delete on public.project_phases for delete to authenticated
  using (public.has_role('administrator', 'dpwh_personnel'));

create policy progress_read on public.progress_updates for select to anon, authenticated
  using (public.can_view_project(project_id));
create policy progress_insert on public.progress_updates for insert to authenticated
  with check (public.has_role('administrator', 'dpwh_personnel'));

-- finance (internal – staff only)
do $$
declare
  t text;
begin
  foreach t in array array['variation_orders', 'financial_obligations', 'disbursements', 'reported_expenses'] loop
    execute format('create policy %1$s_read on public.%1$I for select to authenticated using (public.is_staff())', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated
                      with check (public.has_role(''administrator'', ''dpwh_personnel''))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated
                      using (public.has_role(''administrator'', ''dpwh_personnel''))
                      with check (public.has_role(''administrator'', ''dpwh_personnel''))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated
                      using (public.has_role(''administrator''))', t);
  end loop;
end $$;

-- site images / documents
create policy site_images_read on public.site_images for select to anon, authenticated
  using (public.is_staff() or (is_public_approved and public.can_view_project(project_id)));
create policy site_images_insert on public.site_images for insert to authenticated
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy site_images_update on public.site_images for update to authenticated
  using (public.has_role('administrator', 'dpwh_personnel'))
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy site_images_delete on public.site_images for delete to authenticated
  using (public.has_role('administrator'));

create policy documents_read on public.project_documents for select to anon, authenticated
  using (public.is_staff() or (is_public and public.can_view_project(project_id)));
create policy documents_insert on public.project_documents for insert to authenticated
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy documents_update on public.project_documents for update to authenticated
  using (public.has_role('administrator', 'dpwh_personnel'))
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy documents_delete on public.project_documents for delete to authenticated
  using (public.has_role('administrator'));

-- flag engine output + auditor reviews
create policy evaluations_read on public.flag_evaluations for select to authenticated
  using (public.is_staff());
create policy reviews_read on public.flag_reviews for select to authenticated
  using (public.is_staff());
create policy reviews_insert on public.flag_reviews for insert to authenticated
  with check (public.has_role('auditor'));

-- audit findings / evidence / corrective actions
create policy findings_read on public.audit_findings for select to anon, authenticated
  using (public.is_staff() or (is_published and public.can_view_project(project_id)));
create policy findings_insert on public.audit_findings for insert to authenticated
  with check (public.has_role('auditor'));
create policy findings_update on public.audit_findings for update to authenticated
  using (public.has_role('auditor')) with check (public.has_role('auditor'));

create policy evidence_read on public.audit_evidence for select to authenticated
  using (public.is_staff());
create policy evidence_insert on public.audit_evidence for insert to authenticated
  with check (public.has_role('administrator', 'auditor'));

create policy actions_read on public.corrective_actions for select to authenticated
  using (public.is_staff());
create policy actions_insert on public.corrective_actions for insert to authenticated
  with check (public.has_role('auditor'));
create policy actions_update on public.corrective_actions for update to authenticated
  using (public.has_role('auditor')
         or (public.has_role('dpwh_personnel') and assigned_to = (select auth.uid())))
  with check (public.has_role('auditor')
         or (public.has_role('dpwh_personnel') and assigned_to = (select auth.uid())));

-- activity log: read-only for administrators and auditors
create policy activity_read on public.activity_logs for select to authenticated
  using (public.has_role('administrator', 'auditor'));

-- ---------------------------------------------------------------------------
-- 4. Views (security_invoker: the caller's RLS applies)
-- ---------------------------------------------------------------------------
create view public.v_project_details with (security_invoker = true) as
select p.project_id, p.project_code, p.contract_reference_no, p.name, p.description, p.project_type,
       p.agency_id, a.name as agency_name, a.acronym as agency_acronym,
       p.contractor_id, c.name as contractor_name,
       p.municipality_id, m.name as municipality, p.barangay_id, b.name as barangay,
       p.latitude, p.longitude,
       p.approved_budget, p.contract_amount,
       p.notice_to_proceed, p.duration_days, p.target_completion_date, p.actual_completion_date,
       p.status, p.completion_status, p.overall_progress, p.planned_progress, p.financial_progress,
       p.auto_flag, p.effective_flag, p.flag_reasons, p.needs_review, p.audit_status,
       p.last_evaluated_at, p.is_published, p.published_at,
       img.image_id as latest_image_id, img.storage_path as latest_image_path,
       img.inspection_date as latest_image_date,
       p.created_at, p.updated_at
from public.projects p
join public.implementing_agencies a on a.agency_id = p.agency_id
join public.municipalities m on m.municipality_id = p.municipality_id
left join public.contractors c on c.contractor_id = p.contractor_id
left join public.barangays  b on b.barangay_id   = p.barangay_id
left join lateral (
  select si.image_id, si.storage_path, si.inspection_date
  from public.site_images si
  where si.project_id = p.project_id
  order by si.inspection_date desc, si.uploaded_at desc
  limit 1
) img on true
where p.deleted_at is null;

create view public.v_public_projects with (security_invoker = true) as
select * from public.v_project_details where is_published;

-- Map markers. Clicking a marker → load v_project_details row + signed URL of
-- latest_image_path from the 'panoramas' bucket → open in Pannellum.
create view public.v_map_projects with (security_invoker = true) as
select project_id, project_code, name, project_type, latitude, longitude,
       municipality_id, municipality, barangay_id, barangay, agency_id, agency_name,
       contractor_id, contractor_name, status, completion_status, overall_progress,
       coalesce(effective_flag, auto_flag) as flag, latest_image_id, latest_image_path, is_published
from public.v_project_details;

create view public.v_project_financial_summary with (security_invoker = true) as
select p.project_id, p.project_code, p.name, p.approved_budget, p.contract_amount,
       coalesce(vo.total, 0)                                         as approved_vo_total,
       coalesce(p.contract_amount, p.approved_budget) + coalesce(vo.total, 0) as revised_contract_amount,
       coalesce(ob.total, 0)                                         as obligated_total,
       coalesce(d.total, 0)                                          as disbursed_total,
       coalesce(e.total, 0)                                          as reported_expenses_total,
       coalesce(p.contract_amount, p.approved_budget) + coalesce(vo.total, 0) - coalesce(d.total, 0)
                                                                     as remaining_balance,
       p.overall_progress   as physical_progress_pct,
       p.financial_progress as financial_progress_pct,
       p.financial_progress - p.overall_progress as financial_minus_physical_pct
from public.projects p
left join lateral (select sum(amount) total from public.variation_orders x
                   where x.project_id = p.project_id and x.status = 'approved') vo on true
left join lateral (select sum(amount) total from public.financial_obligations x where x.project_id = p.project_id) ob on true
left join lateral (select sum(amount) total from public.disbursements x where x.project_id = p.project_id) d on true
left join lateral (select sum(amount) total from public.reported_expenses x where x.project_id = p.project_id) e on true
where p.deleted_at is null;

create view public.v_dashboard_stats with (security_invoker = true) as
select count(*)                                                  as total_projects,
       count(*) filter (where coalesce(effective_flag, auto_flag) = 'green')  as green,
       count(*) filter (where coalesce(effective_flag, auto_flag) = 'yellow') as yellow,
       count(*) filter (where coalesce(effective_flag, auto_flag) = 'red')    as red,
       count(*) filter (where completion_status = 'completed')   as completed,
       count(*) filter (where completion_status = 'ongoing')     as ongoing,
       count(*) filter (where completion_status = 'delayed')     as delayed,
       count(*) filter (where completion_status = 'not_started') as not_started,
       count(*) filter (where needs_review)                      as needs_review,
       coalesce(sum(approved_budget), 0)                         as total_approved_budget,
       coalesce(sum(contract_amount), 0)                         as total_contract_amount,
       round(avg(overall_progress), 2)                           as avg_progress
from public.projects
where deleted_at is null;

create view public.v_stats_by_municipality with (security_invoker = true) as
select m.municipality_id, m.name as municipality,
       count(p.project_id)                                                           as total_projects,
       count(p.project_id) filter (where coalesce(p.effective_flag, p.auto_flag) = 'green')  as green,
       count(p.project_id) filter (where coalesce(p.effective_flag, p.auto_flag) = 'yellow') as yellow,
       count(p.project_id) filter (where coalesce(p.effective_flag, p.auto_flag) = 'red')    as red,
       count(p.project_id) filter (where p.completion_status = 'completed')          as completed,
       coalesce(sum(p.approved_budget), 0)                                           as total_approved_budget
from public.municipalities m
left join public.projects p on p.municipality_id = m.municipality_id and p.deleted_at is null
group by m.municipality_id, m.name;

create view public.v_flagged_projects with (security_invoker = true) as
select project_id, project_code, name, municipality, contractor_name, agency_name,
       auto_flag, effective_flag, needs_review, audit_status, completion_status,
       overall_progress, planned_progress, financial_progress, flag_reasons, last_evaluated_at
from public.v_project_details
where needs_review or coalesce(effective_flag, auto_flag) in ('yellow', 'red')
order by needs_review desc,
         case coalesce(effective_flag, auto_flag) when 'red' then 0 when 'yellow' then 1 else 2 end,
         last_evaluated_at desc;

grant select on public.v_project_details, public.v_public_projects, public.v_map_projects,
                public.v_dashboard_stats, public.v_stats_by_municipality
  to anon, authenticated;
grant select on public.v_project_financial_summary, public.v_flagged_projects to authenticated;
grant select on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- 5. RPCs for the client (supabase.rpc(...))
-- ---------------------------------------------------------------------------
-- Publish / unpublish a project for public viewers.
create or replace function public.publish_project(p_project_id uuid, p_publish boolean default true)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.has_role('administrator', 'auditor') then
    raise exception 'Only administrators or auditors can publish projects' using errcode = '42501';
  end if;
  update public.projects
     set is_published = p_publish,
         published_at = case when p_publish then now() end,
         published_by = case when p_publish then auth.uid() end
   where project_id = p_project_id and deleted_at is null;
  if not found then
    raise exception 'Project % not found', p_project_id using errcode = 'P0002';
  end if;
  insert into public.activity_logs (actor_id, actor_role, action, table_name, record_id)
  values (auth.uid(), public.current_user_role(),
          case when p_publish then 'PUBLISH' else 'UNPUBLISH' end, 'projects', p_project_id::text);
end $$;

-- Public disclosure of a site image, document or audit finding.
create or replace function public.set_disclosure(p_kind text, p_id uuid, p_public boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.has_role('administrator', 'auditor') then
    raise exception 'Only administrators or auditors can change public disclosure' using errcode = '42501';
  end if;
  case p_kind
    when 'site_image' then
      update public.site_images
         set is_public_approved = p_public,
             approved_by = case when p_public then auth.uid() end,
             approved_at = case when p_public then now() end
       where image_id = p_id;
    when 'document' then
      update public.project_documents set is_public = p_public where document_id = p_id;
    when 'finding' then
      update public.audit_findings set is_published = p_public where finding_id = p_id;
    else
      raise exception 'Unknown kind %, expected site_image | document | finding', p_kind using errcode = '22023';
  end case;
  if not found then
    raise exception '% % not found', p_kind, p_id using errcode = 'P0002';
  end if;
end $$;

-- Auditor confirms or overrides the automatic flag.
create or replace function public.review_flag(
  p_project_id   uuid,
  p_action       text,
  p_flag         public.flag_color default null,
  p_reason       text default null,
  p_evidence_ids uuid[] default '{}'
)
returns public.flag_reviews
language plpgsql security definer
set search_path = ''
as $$
declare
  v_row public.flag_reviews;
begin
  if not public.has_role('auditor') then
    raise exception 'Only auditors can review flags' using errcode = '42501';
  end if;
  insert into public.flag_reviews (project_id, action, flag, reason, evidence_ids, reviewed_by)
  values (p_project_id, p_action,
          coalesce(p_flag, (select auto_flag from public.projects where project_id = p_project_id)),
          p_reason, coalesce(p_evidence_ids, '{}'), auth.uid())
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.set_audit_status(p_project_id uuid, p_status text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.has_role('auditor') then
    raise exception 'Only auditors can change the audit status' using errcode = '42501';
  end if;
  update public.projects set audit_status = p_status where project_id = p_project_id;
  if not found then
    raise exception 'Project % not found', p_project_id using errcode = 'P0002';
  end if;
  insert into public.activity_logs (actor_id, actor_role, action, table_name, record_id, new_data)
  values (auth.uid(), public.current_user_role(), 'AUDIT_STATUS', 'projects', p_project_id::text,
          jsonb_build_object('audit_status', p_status));
end $$;

-- Staff can force a re-evaluation (e.g. after editing settings).
create or replace function public.rerun_evaluation(p_project_id uuid default null)
returns integer
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can re-run evaluations' using errcode = '42501';
  end if;
  if p_project_id is null then
    if not public.has_role('administrator') then
      raise exception 'Only administrators can re-evaluate all projects' using errcode = '42501';
    end if;
    return public.evaluate_all_projects('manual');
  end if;
  perform public.evaluate_project(p_project_id, 'manual');
  return 1;
end $$;

grant execute on function
  public.admin_set_user_access(uuid, public.user_role, boolean, boolean, uuid),
  public.log_event(text, text, text, jsonb),
  public.publish_project(uuid, boolean),
  public.set_disclosure(text, uuid, boolean),
  public.review_flag(uuid, text, public.flag_color, text, uuid[]),
  public.set_audit_status(uuid, text),
  public.rerun_evaluation(uuid),
  public.create_project_phases_from_template(uuid)
to authenticated;
grant execute on all functions in schema public to service_role;
