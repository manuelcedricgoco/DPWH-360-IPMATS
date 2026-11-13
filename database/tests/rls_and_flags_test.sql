-- =============================================================================
-- DPWH 360° – rls_and_flags_test.sql
-- Verifies RLS / grants per role, the flag engine and auditor reviews.
-- Runs entirely inside a transaction that is ROLLED BACK: safe on any database
-- that has migrations 000–005 + seed.sql applied (needs the 4 sample users:
-- one approved account per role).
-- Every check raises an exception on failure; success prints "ALL TESTS PASSED".
-- =============================================================================
begin;

create function pg_temp.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'TEST FAILED: %', p_msg; end if;
end $$;

-- Runs p_sql and fails the test if it does NOT raise an error.
create function pg_temp.fails(p_sql text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    return;
  end;
  raise exception 'TEST FAILED (expected an error): %', p_msg;
end $$;

create function pg_temp.n(p_sql text) returns bigint language plpgsql as $$
declare v bigint;
begin
  execute 'select count(*) from (' || p_sql || ') q' into v;
  return v;
end $$;

grant execute on all functions in schema pg_temp to anon, authenticated;

-- Account ids used below
create temp table ids as
select (select id from public.profiles where role = 'administrator'  and is_approved order by created_at limit 1) as admin_id,
       (select id from public.profiles where role = 'dpwh_personnel' and is_approved order by created_at limit 1) as staff_id,
       (select id from public.profiles where role = 'auditor'        and is_approved order by created_at limit 1) as auditor_id,
       (select id from public.profiles where role = 'public_viewer'  and is_approved order by created_at limit 1) as viewer_id,
       (select count(*) from public.projects where is_published and deleted_at is null) as published,
       (select count(*) from public.projects where deleted_at is null) as total;
grant select on ids to anon, authenticated;

select pg_temp.ok((select admin_id is not null and staff_id is not null and auditor_id is not null and viewer_id is not null from ids),
                  'one approved account per role exists');

-- -----------------------------------------------------------------------------
-- 1. Flag engine results on the seed scenarios
-- -----------------------------------------------------------------------------
select pg_temp.ok(auto_flag::text = exp_flag and completion_status::text = exp_status,
                  format('%s expected %s/%s, got %s/%s', project_code, exp_flag, exp_status, auto_flag, completion_status))
from public.projects
join (values ('OM-2026-0001', 'green',  'ongoing'),     ('OM-2026-0002', 'green',  'completed'),
             ('OM-2026-0003', 'yellow', 'delayed'),     ('OM-2026-0004', 'yellow', 'ongoing'),
             ('OM-2026-0005', 'red',    'delayed'),     ('OM-2026-0006', 'red',    'ongoing'),
             ('OM-2026-0007', 'red',    'ongoing'),     ('OM-2026-0008', 'yellow', 'ongoing'),
             ('OM-2026-0009', 'green',  'not_started'), ('OM-2026-0011', 'yellow', 'ongoing'),
             ('OM-2026-0012', 'yellow', 'ongoing')) e(code, exp_flag, exp_status)
  on e.code = project_code
where e.exp_flag::public.flag_color <> auto_flag or e.exp_status <> completion_status::text;

select pg_temp.ok((select count(*) = 11 from public.projects
                   where project_code in ('OM-2026-0001','OM-2026-0002','OM-2026-0003','OM-2026-0004','OM-2026-0005',
                                          'OM-2026-0006','OM-2026-0007','OM-2026-0008','OM-2026-0009','OM-2026-0011','OM-2026-0012')),
                  'seed scenario projects exist');
select pg_temp.ok((select effective_flag = 'green' and not needs_review from public.projects where project_code = 'OM-2026-0004'),
                  'auditor override keeps OM-2026-0004 green');
select pg_temp.ok((select not needs_review from public.projects where project_code = 'OM-2026-0001'),
                  'green project does not need review');
select pg_temp.ok((select flag_reasons @> '[{"check":"documentation","severity":"red"}]' from public.projects where project_code = 'OM-2026-0006'),
                  'reused image reason recorded');
select pg_temp.ok((select count(*) > 0 from cron.job where jobname = 'dpwh360-daily-flag-check'), 'daily cron job registered');

-- -----------------------------------------------------------------------------
-- 2. anon (not signed in)
-- -----------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select pg_temp.ok(pg_temp.n('select * from public.projects') = (select published from ids), 'anon sees only published projects');
select pg_temp.ok(pg_temp.n('select * from public.v_map_projects') = (select published from ids), 'anon map shows published projects');
select pg_temp.ok(pg_temp.n('select * from public.site_images where not is_public_approved') = 0, 'anon sees only approved images');
select pg_temp.ok(pg_temp.n('select * from public.audit_findings where not is_published') = 0, 'anon sees only published findings');
select pg_temp.fails('select * from public.disbursements', 'anon cannot read disbursements');
select pg_temp.fails('select * from public.activity_logs', 'anon cannot read activity logs');
select pg_temp.fails('select * from public.profiles', 'anon cannot read profiles');
select pg_temp.fails($$insert into public.contractors (name) values ('Anon Co')$$, 'anon cannot insert');
reset role;

-- -----------------------------------------------------------------------------
-- 3. public viewer
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', viewer_id, 'role', 'authenticated')::text, true) from ids;
set local role authenticated;
select pg_temp.ok(pg_temp.n('select * from public.projects') = (select published from ids), 'viewer sees only published projects');
select pg_temp.ok(pg_temp.n('select * from public.disbursements') = 0, 'viewer sees no internal finance');
select pg_temp.ok(pg_temp.n('select * from public.profiles') = 1, 'viewer sees only own profile');
select pg_temp.fails($$insert into public.projects (project_code, name, project_type, agency_id, approved_budget,
                       municipality_id, latitude, longitude, duration_days)
                     select 'X-1', 'x', 'road', agency_id, 1, 1, 13, 120.5, 10 from public.implementing_agencies limit 1$$,
                     'viewer cannot create projects');
select pg_temp.fails($$update public.profiles set role = 'administrator' where id = auth.uid()$$, 'viewer cannot change own role');
select pg_temp.fails($$select public.publish_project((select project_id from public.projects limit 1))$$, 'viewer cannot publish');
update public.profiles set full_name = 'Renamed Viewer' where id = auth.uid();
select pg_temp.ok((select full_name = 'Renamed Viewer' from public.profiles where id = auth.uid()), 'viewer can rename self');
reset role;

-- -----------------------------------------------------------------------------
-- 4. DPWH personnel
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', staff_id, 'role', 'authenticated')::text, true) from ids;
set local role authenticated;
select pg_temp.ok(pg_temp.n('select * from public.projects') = (select total from ids), 'personnel see all projects');

insert into public.projects (project_id, project_code, name, project_type, agency_id, approved_budget, contract_amount,
                             municipality_id, latitude, longitude, notice_to_proceed, duration_days)
select 'dddddddd-0000-4000-8000-000000000001', 'TEST-0001', 'Test road', 'road', agency_id, 1000000, 900000,
       1, 13.4, 120.7, (now() at time zone 'Asia/Manila')::date - 50, 100
from public.implementing_agencies limit 1;

select pg_temp.ok(pg_temp.n($$select * from public.project_phases where project_id = 'dddddddd-0000-4000-8000-000000000001'$$) = 5,
                  'phases created from template');
select pg_temp.ok((select auto_flag is not null from public.projects where project_id = 'dddddddd-0000-4000-8000-000000000001'),
                  'new project evaluated automatically');
select pg_temp.ok((select target_completion_date = notice_to_proceed + 99 from public.projects
                   where project_id = 'dddddddd-0000-4000-8000-000000000001'), 'target date derived from NTP + duration');

select pg_temp.fails($$update public.projects set auto_flag = 'green' where project_code = 'TEST-0001'$$, 'personnel cannot set auto_flag');
select pg_temp.fails($$update public.projects set is_published = true where project_code = 'TEST-0001'$$, 'personnel cannot publish via update');
select pg_temp.fails($$update public.project_phases set accomplishment_pct = 100 where project_id = 'dddddddd-0000-4000-8000-000000000001'$$,
                     'accomplishment only via progress updates');
select pg_temp.fails($$update public.project_phases set weight_pct = 50
                       where project_id = 'dddddddd-0000-4000-8000-000000000001' and sequence = 1;
                       set constraints all immediate$$, 'phase weights must total 100');

-- Progress update moves the phase and re-evaluates
insert into public.progress_updates (project_id, phase_id, reported_pct, report_date)
select project_id, phase_id, 100, (now() at time zone 'Asia/Manila')::date
from public.project_phases where project_id = 'dddddddd-0000-4000-8000-000000000001' and sequence = 1;
select pg_temp.ok((select overall_progress = 10 from public.projects where project_code = 'TEST-0001'),
                  'overall progress recomputed after progress update');

-- 360° image: distance + reuse detection
insert into public.site_images (project_id, storage_path, sha256, gps_lat, gps_lng)
values ('dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001/a.jpg', repeat('a', 64), 13.4, 120.7);
insert into public.site_images (project_id, storage_path, sha256, gps_lat, gps_lng)
values ('dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001/b.jpg', repeat('a', 64), 13.4, 120.7);
select pg_temp.ok((select is_reused from public.site_images where storage_path like '%/b.jpg'), 'reused hash detected');
select pg_temp.ok((select auto_flag = 'red' from public.projects where project_code = 'TEST-0001'), 'reused image turns flag red');
select pg_temp.fails($$update public.site_images set is_public_approved = true where storage_path like '%/a.jpg'$$,
                     'personnel cannot approve images for the public');
select pg_temp.fails($$insert into public.site_images (project_id, storage_path, sha256)
                       values ('dddddddd-0000-4000-8000-000000000001', 'other-folder/c.jpg', repeat('b', 64))$$,
                     'image path must be inside the project folder');

-- Over-disbursement → red financial reason
insert into public.disbursements (project_id, disbursement_date, amount)
values ('dddddddd-0000-4000-8000-000000000001', (now() at time zone 'Asia/Manila')::date, 950000);
select pg_temp.ok((select flag_reasons @> '[{"check":"financial","severity":"red"}]' from public.projects where project_code = 'TEST-0001'),
                  'over-disbursement detected');

select pg_temp.fails($$insert into public.flag_reviews (project_id, action, flag, reason)
                       values ('dddddddd-0000-4000-8000-000000000001', 'confirm', 'red', 'personnel try to confirm')$$,
                     'personnel cannot review flags');
delete from public.projects where project_code = 'TEST-0001';   -- RLS: silently 0 rows
select pg_temp.ok(pg_temp.n($$select * from public.projects where project_code = 'TEST-0001'$$) = 1,
                  'personnel cannot hard-delete projects');
select pg_temp.ok(pg_temp.n('select * from public.activity_logs') = 0, 'personnel cannot read activity logs');

-- Corrective action assigned to this user: may change status/remarks only
select pg_temp.ok(pg_temp.n('select * from public.corrective_actions where assigned_to = auth.uid()') >= 1,
                  'assigned corrective action visible');
update public.corrective_actions set status = 'done', remarks = 'New capture uploaded' where assigned_to = auth.uid();
select pg_temp.fails($$update public.corrective_actions set due_date = due_date + 30 where assigned_to = auth.uid()$$,
                     'personnel cannot move due dates');
select pg_temp.fails($$update public.corrective_actions set status = 'verified' where assigned_to = auth.uid()$$,
                     'personnel cannot verify actions');

-- Storage: upload into own project folder works, random folder does not
insert into storage.objects (bucket_id, name) values ('panoramas', 'dddddddd-0000-4000-8000-000000000001/a.jpg');
select pg_temp.fails($$insert into storage.objects (bucket_id, name) values ('panoramas', 'not-a-project/x.jpg')$$,
                     'storage upload needs an existing project folder');
select pg_temp.fails($$insert into storage.objects (bucket_id, name) values ('audit-evidence', 'dddddddd-0000-4000-8000-000000000001/e.pdf')$$,
                     'personnel cannot upload audit evidence');
reset role;

-- -----------------------------------------------------------------------------
-- 5. Auditor
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', auditor_id, 'role', 'authenticated')::text, true) from ids;
set local role authenticated;
select pg_temp.ok(pg_temp.n('select * from public.disbursements') > 0, 'auditor reads finance');
select pg_temp.ok(pg_temp.n('select * from public.activity_logs') > 0, 'auditor reads activity logs');
select pg_temp.ok(pg_temp.n('select * from public.v_flagged_projects') > 0, 'auditor sees flagged queue');
select pg_temp.fails($$select public.review_flag('dddddddd-0000-4000-8000-000000000001', 'override', 'green', 'Looks fine to me on site')$$,
                     'override without evidence is rejected');
select pg_temp.fails($$select public.review_flag('dddddddd-0000-4000-8000-000000000001', 'confirm', null, 'short')$$,
                     'review reason must be at least 10 characters');
update public.projects set name = 'auditor edit' where project_code = 'TEST-0001';   -- RLS: 0 rows
select pg_temp.ok(pg_temp.n($$select * from public.projects where name = 'auditor edit'$$) = 0,
                  'auditor cannot edit projects');

insert into storage.objects (bucket_id, name) values ('audit-evidence', 'dddddddd-0000-4000-8000-000000000001/e.pdf');
insert into public.audit_evidence (evidence_id, project_id, storage_path, description)
values ('eeeeeeee-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001',
        'dddddddd-0000-4000-8000-000000000001/e.pdf', 'Inspection photos');
select public.review_flag('dddddddd-0000-4000-8000-000000000001', 'override', 'yellow',
                          'Duplicate upload was a clerical error, verified on site',
                          array['eeeeeeee-0000-4000-8000-000000000001']::uuid[]);
select pg_temp.ok((select effective_flag = 'yellow' and auto_flag = 'red' and not needs_review
                   from public.projects where project_code = 'TEST-0001'), 'override sets effective flag');
select pg_temp.fails($$update public.flag_reviews set flag = 'green'$$, 'flag reviews are immutable');
select public.publish_project('dddddddd-0000-4000-8000-000000000001');
select public.set_disclosure('site_image', (select image_id from public.site_images where storage_path like 'dddddddd%/a.jpg'), true);
select public.set_audit_status('dddddddd-0000-4000-8000-000000000001', 'under_review');
reset role;

-- override stays while the auto flag is unchanged; a new auto flag re-opens review
select public.evaluate_project('dddddddd-0000-4000-8000-000000000001', 'manual');
select pg_temp.ok((select effective_flag = 'yellow' from public.projects where project_code = 'TEST-0001'),
                  'override survives re-evaluation with the same auto flag');
delete from public.site_images where storage_path like 'dddddddd%/b.jpg';
delete from public.disbursements where project_id = 'dddddddd-0000-4000-8000-000000000001';
update public.projects set notice_to_proceed = (now() at time zone 'Asia/Manila')::date
 where project_code = 'TEST-0001';                     -- back on schedule
select pg_temp.ok((select auto_flag <> 'red' and effective_flag = auto_flag from public.projects where project_code = 'TEST-0001'),
                  'override lapses when the auto flag changes');

-- anon can now read the published project and its approved panorama object
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select pg_temp.ok(pg_temp.n($$select * from public.projects where project_code = 'TEST-0001'$$) = 1, 'published project visible to anon');
select pg_temp.ok(pg_temp.n($$select * from storage.objects where name = 'dddddddd-0000-4000-8000-000000000001/a.jpg'$$) = 1,
                  'approved panorama object readable by anon');
select pg_temp.ok(pg_temp.n($$select * from storage.objects where bucket_id = 'audit-evidence'$$) = 0, 'evidence hidden from anon');
reset role;

-- -----------------------------------------------------------------------------
-- 6. Administrator
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true) from ids;
set local role authenticated;
update public.system_settings set numeric_value = 6 where key = 'slippage_yellow_pct';
select pg_temp.ok((select numeric_value = 6 from public.system_settings where key = 'slippage_yellow_pct'), 'admin edits thresholds');
select public.admin_set_user_access((select viewer_id from ids), 'auditor', true);
select pg_temp.ok((select role = 'auditor' from public.profiles where id = (select viewer_id from ids)), 'admin changes roles');
select pg_temp.fails($$select public.admin_set_user_access(auth.uid(), 'public_viewer')$$, 'admin cannot demote self');
select pg_temp.fails($$update public.activity_logs set action = 'X'$$, 'admin cannot edit logs');
reset role;

-- -----------------------------------------------------------------------------
-- 7. Sign-up flow + log immutability (as owner)
-- -----------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values ('ffffffff-0000-4000-8000-000000000001', 'new.auditor@example.test',
        '{"full_name":"New Person","requested_role":"auditor"}');
select pg_temp.ok((select role = 'public_viewer' and requested_role = 'auditor' and not is_approved
                   from public.profiles where id = 'ffffffff-0000-4000-8000-000000000001'), 'privileged sign-up waits for approval');
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.ok(not public.is_staff(), 'unapproved user is not staff');
select pg_temp.ok(pg_temp.n('select * from public.disbursements') = 0, 'unapproved user sees no finance');
reset role;

select pg_temp.fails('update public.activity_logs set action = action', 'activity log is insert-only even for owner');
select pg_temp.fails('delete from public.activity_logs', 'activity log rows cannot be deleted');
select pg_temp.ok((select count(*) > 0 from public.activity_logs where table_name = 'projects' and action = 'PUBLISH'),
                  'publish is logged');

select 'ALL TESTS PASSED' as result;
rollback;
