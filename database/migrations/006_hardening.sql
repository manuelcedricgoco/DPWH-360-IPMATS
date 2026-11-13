-- =============================================================================
-- DPWH 360° – 006_hardening.sql
-- Fixes from the Supabase advisors after 005:
--   1. Functions created in 005 after its REVOKE kept PostgreSQL's default
--      EXECUTE grant to PUBLIC (so anon could call the RPCs; their role checks
--      still blocked it, but the grant should not exist).
--   2. "FOR ALL" write policies overlapped the read policies on three lookup
--      tables (multiple permissive SELECT policies) – split per command.
--
-- Rule for future migrations: every new function in public must be followed by
--   revoke execute on function ... from public;  grant execute ... to <roles>;
-- =============================================================================

-- 1. No function in public is executable by PUBLIC; re-grant only what is intended.
revoke execute on all functions in schema public from public, anon;

-- RLS / storage-policy helpers must stay executable by the API roles: policies
-- run with the caller's privileges. They only reveal the caller's own role or
-- whether a project/file is published.
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

-- RPCs for signed-in users (each checks the caller's role itself).
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

-- 2. Split FOR ALL write policies so SELECT is covered by one policy only.
drop policy barangays_write on public.barangays;
create policy barangays_insert on public.barangays for insert to authenticated
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy barangays_update on public.barangays for update to authenticated
  using (public.has_role('administrator', 'dpwh_personnel'))
  with check (public.has_role('administrator', 'dpwh_personnel'));
create policy barangays_delete on public.barangays for delete to authenticated
  using (public.has_role('administrator', 'dpwh_personnel'));

drop policy agencies_write on public.implementing_agencies;
create policy agencies_insert on public.implementing_agencies for insert to authenticated
  with check (public.has_role('administrator'));
create policy agencies_update on public.implementing_agencies for update to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));
create policy agencies_delete on public.implementing_agencies for delete to authenticated
  using (public.has_role('administrator'));

drop policy templates_write on public.phase_templates;
create policy templates_insert on public.phase_templates for insert to authenticated
  with check (public.has_role('administrator'));
create policy templates_update on public.phase_templates for update to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));
create policy templates_delete on public.phase_templates for delete to authenticated
  using (public.has_role('administrator'));
