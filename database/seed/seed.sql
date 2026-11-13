-- =============================================================================
-- DPWH 360° – seed.sql  (SAMPLE / FICTIONAL DATA – for development and demos)
--
-- Every agency e-mail, contractor, project code, amount and image here is made
-- up. Dates are relative to "today" (Asia/Manila) so the flag scenarios stay
-- the same whenever the seed is run:
--
--   code          scenario                                expected flag / completion
--   OM-2026-0001  road, on schedule, fresh image          green  / ongoing
--   OM-2026-0002  bridge, finished with final image       green  / completed
--   OM-2026-0003  flood control, 9% slippage              yellow / delayed
--   OM-2026-0004  road, latest image 60 days old          yellow / ongoing (auditor override -> green)
--   OM-2026-0005  bridge, target date passed              red    / delayed (auditor confirmed)
--   OM-2026-0006  road, reused image hash                 red    / ongoing
--   OM-2026-0007  flood control, paid far ahead of work   red    / ongoing
--   OM-2026-0008  road, started but no 360° image yet     yellow / ongoing
--   OM-2026-0009  bridge, NTP next month                  green  / not_started
--   OM-2026-0010  road, suspended                         yellow / ongoing
--   OM-2026-0011  flood control, image ~1 km off site     yellow / ongoing
--   OM-2026-0012  road, 100% but no final image           yellow / ongoing
--
-- Run after migrations 000–005 (as postgres / service role). Re-runnable:
-- it deletes previous sample rows first (project codes OM-2026-00xx).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Clean previous sample data
-- ---------------------------------------------------------------------------
delete from public.projects where project_code like 'OM-2026-00%';
delete from public.contractors where license_number like 'PCAB-SAMPLE-%';
delete from public.implementing_agencies where contact_email like '%@example.test';

-- ---------------------------------------------------------------------------
-- Agencies, contractors, barangays
-- ---------------------------------------------------------------------------
insert into public.implementing_agencies (agency_id, name, acronym, office_type, address, contact_email) values
  ('a1000000-0000-4000-8000-000000000001', 'DPWH MIMAROPA Regional Office (Sample)',                 'DPWH-R4B',   'regional_office',             'Calapan City, Oriental Mindoro', 'region4b@example.test'),
  ('a1000000-0000-4000-8000-000000000002', 'DPWH Occidental Mindoro 1st District Engineering Office (Sample)', 'DPWH-OM1DEO', 'district_engineering_office', 'Mamburao, Occidental Mindoro', 'om1deo@example.test'),
  ('a1000000-0000-4000-8000-000000000003', 'DPWH Occidental Mindoro 2nd District Engineering Office (Sample)', 'DPWH-OM2DEO', 'district_engineering_office', 'San Jose, Occidental Mindoro', 'om2deo@example.test'),
  ('a1000000-0000-4000-8000-000000000004', 'Occidental Mindoro Provincial Engineering Office (Sample)', 'OM-PEO',  'provincial_office',           'Mamburao, Occidental Mindoro', 'peo@example.test');

insert into public.contractors (contractor_id, name, license_number, address, contact_person, contact_email, contact_phone) values
  ('c1000000-0000-4000-8000-000000000001', 'Mindoro Prime Builders Corp. (Sample)',          'PCAB-SAMPLE-0001', 'Mamburao, Occidental Mindoro',  'Juan Dela Cruz', 'juan@example.test',  '0917 000 0001'),
  ('c1000000-0000-4000-8000-000000000002', 'Sablayan Roadworks and Construction (Sample)',   'PCAB-SAMPLE-0002', 'Sablayan, Occidental Mindoro',  'Maria Santos',   'maria@example.test', '0917 000 0002'),
  ('c1000000-0000-4000-8000-000000000003', 'Lubang Island Engineering Services (Sample)',    'PCAB-SAMPLE-0003', 'Lubang, Occidental Mindoro',    'Pedro Reyes',    'pedro@example.test', '0917 000 0003'),
  ('c1000000-0000-4000-8000-000000000004', 'San Jose Heavy Equipment and Builders (Sample)', 'PCAB-SAMPLE-0004', 'San Jose, Occidental Mindoro',  'Ana Bautista',   'ana@example.test',   '0917 000 0004'),
  ('c1000000-0000-4000-8000-000000000005', 'Western Mindoro Bridge Contractors Inc. (Sample)', 'PCAB-SAMPLE-0005', 'Calintaan, Occidental Mindoro', 'Carlo Mendoza', 'carlo@example.test', '0917 000 0005'),
  ('c1000000-0000-4000-8000-000000000006', 'Sample Builders Corp.',                          'PCAB-SAMPLE-0006', 'Sablayan, Occidental Mindoro',  'Liza Ramos',     'liza@example.test',  '0917 000 0006');

insert into public.barangays (municipality_id, name)
select m.municipality_id, b.name
from (values
  ('Mamburao', 'Poblacion 1'), ('Mamburao', 'Payompon'), ('Mamburao', 'Tayamaan'), ('Mamburao', 'Talabaan'),
  ('San Jose', 'Poblacion'), ('San Jose', 'Bubog'), ('San Jose', 'Central'),
  ('Sablayan', 'Poblacion'), ('Sablayan', 'Buenavista'), ('Sablayan', 'San Nicolas'),
  ('Abra de Ilog', 'Poblacion'), ('Abra de Ilog', 'Wawa'),
  ('Calintaan', 'Poblacion'), ('Calintaan', 'Concepcion'),
  ('Looc', 'Poblacion'), ('Lubang', 'Tagbac'), ('Lubang', 'Vigo'),
  ('Magsaysay', 'Poblacion'), ('Paluan', 'Poblacion'), ('Rizal', 'Pitogo'), ('Santa Cruz', 'Poblacion I')
) b(muni, name)
join public.municipalities m on m.name = b.muni
on conflict (municipality_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers (dropped at the end)
-- ---------------------------------------------------------------------------
create function pg_temp.brgy(p_muni text, p_name text) returns integer language sql as $$
  select b.barangay_id from public.barangays b join public.municipalities m using (municipality_id)
  where m.name = p_muni and b.name = p_name $$;
create function pg_temp.muni(p_muni text) returns smallint language sql as $$
  select municipality_id from public.municipalities where name = p_muni $$;
create function pg_temp.today() returns date language sql as $$
  select (now() at time zone 'Asia/Manila')::date $$;
create function pg_temp.hash(p text) returns text language sql as $$
  select encode(sha256(convert_to(p, 'UTF8')), 'hex') $$;
create function pg_temp.uid(p_role text) returns uuid language sql as $$
  select id from public.profiles where role::text = p_role and is_approved order by created_at limit 1 $$;

-- Fill phases in sequence until the overall accomplishment equals p_actual.
create function pg_temp.set_progress(p_project uuid, p_actual numeric, p_date date) returns void
language plpgsql as $$
declare
  r record;
  v_left numeric := p_actual;
  v_pct  numeric;
begin
  for r in select phase_id, weight_pct from public.project_phases
           where project_id = p_project order by sequence loop
    exit when v_left <= 0;
    v_pct  := least(100, round(v_left * 100 / r.weight_pct, 2));
    v_left := v_left - r.weight_pct * v_pct / 100;
    insert into public.progress_updates (project_id, phase_id, reported_pct, report_date, narrative, submitted_by)
    values (p_project, r.phase_id, v_pct, p_date, 'Sample progress report', pg_temp.uid('dpwh_personnel'));
  end loop;
end $$;

-- Progress = planned progress today minus p_slip.
create function pg_temp.track(p_project uuid, p_slip numeric, p_date date) returns void
language plpgsql as $$
begin
  perform pg_temp.set_progress(p_project,
    greatest(0, public.compute_planned_progress(p_project, pg_temp.today()) - p_slip), p_date);
end $$;

create function pg_temp.image(p_project uuid, p_n int, p_days_ago int, p_dlat numeric default 0.0004,
                              p_hash text default null, p_final boolean default false) returns void
language plpgsql as $$
declare
  v_lat numeric; v_lng numeric;
begin
  select latitude, longitude into v_lat, v_lng from public.projects where project_id = p_project;
  insert into public.site_images (project_id, storage_path, mime_type, file_size_bytes, sha256, captured_at,
                                  inspection_date, gps_lat, gps_lng, is_final, caption, uploaded_by)
  values (p_project, p_project || '/sample-' || p_n || '.jpg', 'image/jpeg', 8500000,
          coalesce(p_hash, pg_temp.hash(p_project || '-' || p_n)),
          (pg_temp.today() - p_days_ago)::timestamptz + interval '9 hours',
          pg_temp.today() - p_days_ago, v_lat + p_dlat, v_lng, p_final,
          'Sample 360° site capture #' || p_n, pg_temp.uid('dpwh_personnel'));
end $$;

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
insert into public.projects (project_id, project_code, contract_reference_no, name, description, project_type,
  agency_id, contractor_id, approved_budget, contract_amount, municipality_id, barangay_id,
  latitude, longitude, notice_to_proceed, duration_days, status, created_by)
select v.id::uuid, v.code, v.ref, v.name, v.descr, v.ptype::public.project_type,
       v.agency::uuid, v.contractor::uuid, v.budget, v.contract, pg_temp.muni(v.muni), pg_temp.brgy(v.muni, v.brgy),
       v.lat, v.lng, pg_temp.today() + v.ntp_offset, v.dur, v.status::public.project_status,
       pg_temp.uid('dpwh_personnel')
from (values
  ('b1000000-0000-4000-8000-000000000001', 'OM-2026-0001', 'CT-SAMPLE-0001', 'SAMPLE Road Concreting, Mamburao–Payompon Section',
   'Concreting of 2.1 km two-lane national road', 'road', 'a1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001',
   48000000, 46750000, 'Mamburao', 'Payompon', 13.2050, 120.6120, -120, 240, 'active'),
  ('b1000000-0000-4000-8000-000000000002', 'OM-2026-0002', 'CT-SAMPLE-0002', 'SAMPLE Bridge Replacement, Buenavista Creek',
   'Replacement of a 40 m RCDG bridge', 'bridge', 'a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000005',
   65000000, 63200000, 'Sablayan', 'Buenavista', 12.8600, 120.8100, -400, 300, 'active'),
  ('b1000000-0000-4000-8000-000000000003', 'OM-2026-0003', 'CT-SAMPLE-0003', 'SAMPLE Flood Control Revetment, Bubog River',
   'Construction of 600 m concrete revetment', 'flood_control', 'a1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000004',
   55000000, 53900000, 'San Jose', 'Bubog', 12.3700, 121.0500, -150, 300, 'active'),
  ('b1000000-0000-4000-8000-000000000004', 'OM-2026-0004', 'CT-SAMPLE-0004', 'SAMPLE Road Widening, Abra de Ilog Poblacion',
   'Widening of 1.5 km road to four lanes', 'road', 'a1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002',
   28000000, 27100000, 'Abra de Ilog', 'Poblacion', 13.4430, 120.7290, -100, 210, 'active'),
  ('b1000000-0000-4000-8000-000000000005', 'OM-2026-0005', 'CT-SAMPLE-0005', 'SAMPLE Bridge Rehabilitation, Calintaan',
   'Rehabilitation of a 25 m bridge deck and approaches', 'bridge', 'a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000005',
   36000000, 35100000, 'Calintaan', 'Concepcion', 12.5900, 120.9400, -330, 270, 'active'),
  ('b1000000-0000-4000-8000-000000000006', 'OM-2026-0006', 'CT-SAMPLE-0006', 'SAMPLE Road Rehabilitation, Sablayan–San Nicolas',
   'Asphalt overlay and drainage, 3 km', 'road', 'a1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000006',
   22000000, 21400000, 'Sablayan', 'San Nicolas', 12.8100, 120.8300, -90, 180, 'active'),
  ('b1000000-0000-4000-8000-000000000007', 'OM-2026-0007', 'CT-SAMPLE-0007', 'SAMPLE Flood Control Dike, Pitogo',
   'Earth dike with concrete slope protection, 800 m', 'flood_control', 'a1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000004',
   30000000, 29200000, 'Rizal', 'Pitogo', 12.4700, 120.9800, -60, 200, 'active'),
  ('b1000000-0000-4000-8000-000000000008', 'OM-2026-0008', 'CT-SAMPLE-0008', 'SAMPLE Road Concreting, Paluan Poblacion',
   'Concreting of 1.2 km access road', 'road', 'a1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001',
   15000000, 14600000, 'Paluan', 'Poblacion', 13.4150, 120.4650, -20, 150, 'active'),
  ('b1000000-0000-4000-8000-000000000009', 'OM-2026-0009', 'CT-SAMPLE-0009', 'SAMPLE Bridge Construction, Magsaysay',
   'New 60 m PSCG bridge', 'bridge', 'a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000005',
   52000000, 50300000, 'Magsaysay', 'Poblacion', 12.3200, 121.1400, 30, 330, 'active'),
  ('b1000000-0000-4000-8000-000000000010', 'OM-2026-0010', 'CT-SAMPLE-0010', 'SAMPLE Road Concreting, Lubang Island',
   'Concreting of 2 km circumferential road', 'road', 'a1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000003',
   21000000, 20400000, 'Lubang', 'Tagbac', 13.8500, 120.1300, -80, 180, 'suspended'),
  ('b1000000-0000-4000-8000-000000000011', 'OM-2026-0011', 'CT-SAMPLE-0011', 'SAMPLE Flood Control Revetment, Looc',
   'Coastal revetment, 400 m', 'flood_control', 'a1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000003',
   27500000, 26800000, 'Looc', 'Poblacion', 13.7400, 120.2550, -70, 240, 'active'),
  ('b1000000-0000-4000-8000-000000000012', 'OM-2026-0012', 'CT-SAMPLE-0012', 'SAMPLE Road Concreting, Santa Cruz Poblacion',
   'Concreting of 0.9 km barangay road', 'road', 'a1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002',
   19000000, 18300000, 'Santa Cruz', 'Poblacion I', 13.0780, 120.7160, -140, 150, 'active')
) v(id, code, ref, name, descr, ptype, agency, contractor, budget, contract, muni, brgy, lat, lng, ntp_offset, dur, status);

-- ---------------------------------------------------------------------------
-- Progress, images and finance per scenario
-- ---------------------------------------------------------------------------
do $$
declare
  d   date := pg_temp.today();
  p1  uuid := 'b1000000-0000-4000-8000-000000000001';
  p2  uuid := 'b1000000-0000-4000-8000-000000000002';
  p3  uuid := 'b1000000-0000-4000-8000-000000000003';
  p4  uuid := 'b1000000-0000-4000-8000-000000000004';
  p5  uuid := 'b1000000-0000-4000-8000-000000000005';
  p6  uuid := 'b1000000-0000-4000-8000-000000000006';
  p7  uuid := 'b1000000-0000-4000-8000-000000000007';
  p8  uuid := 'b1000000-0000-4000-8000-000000000008';
  p10 uuid := 'b1000000-0000-4000-8000-000000000010';
  p11 uuid := 'b1000000-0000-4000-8000-000000000011';
  p12 uuid := 'b1000000-0000-4000-8000-000000000012';
  v_staff uuid := pg_temp.uid('dpwh_personnel');
begin
  -- 1 green, on schedule
  perform pg_temp.track(p1, 1, d - 3);
  perform pg_temp.image(p1, 1, 40);
  perform pg_temp.image(p1, 2, 5);
  insert into public.variation_orders (project_id, vo_number, description, amount, time_ext_days, status, approved_date, recorded_by)
  values (p1, 'VO-01', 'Additional cross drains', 850000, 0, 'approved', d - 30, v_staff);
  insert into public.financial_obligations (project_id, reference_no, obligation_date, amount, description, recorded_by)
  values (p1, 'ORS-SAMPLE-0001', d - 125, 46750000, 'Obligation of contract amount', v_staff);
  insert into public.disbursements (project_id, reference_no, disbursement_date, amount, billing_type, recorded_by) values
    (p1, 'DV-SAMPLE-0001', d - 110, 7012500, 'advance_payment', v_staff),
    (p1, 'DV-SAMPLE-0002', d - 30,  12000000, 'progress_billing', v_staff);
  insert into public.reported_expenses (project_id, expense_date, category, amount, description, recorded_by)
  values (p1, d - 20, 'materials', 6200000, 'Cement and aggregates', v_staff);

  -- 2 green, completed
  perform pg_temp.set_progress(p2, 100, d - 110);
  update public.projects set actual_completion_date = d - 110 where project_id = p2;
  perform pg_temp.image(p2, 1, 200);
  perform pg_temp.image(p2, 2, 110, 0.0003, null, true);
  insert into public.disbursements (project_id, reference_no, disbursement_date, amount, billing_type, recorded_by) values
    (p2, 'DV-SAMPLE-0003', d - 380, 9480000, 'advance_payment', v_staff),
    (p2, 'DV-SAMPLE-0004', d - 250, 25000000, 'progress_billing', v_staff),
    (p2, 'DV-SAMPLE-0005', d - 95,  25560000, 'final_billing', v_staff);

  -- 3 yellow, ~9% slippage
  perform pg_temp.track(p3, 9, d - 4);
  perform pg_temp.image(p3, 1, 4);
  insert into public.disbursements (project_id, reference_no, disbursement_date, amount, billing_type, recorded_by)
  values (p3, 'DV-SAMPLE-0006', d - 140, 8085000, 'advance_payment', v_staff);

  -- 4 yellow, stale documentation (auditor later overrides to green)
  perform pg_temp.track(p4, 0, d - 2);
  perform pg_temp.image(p4, 1, 60);

  -- 5 red, overdue
  perform pg_temp.set_progress(p5, 78, d - 10);
  perform pg_temp.image(p5, 1, 10);
  insert into public.disbursements (project_id, reference_no, disbursement_date, amount, billing_type, recorded_by)
  values (p5, 'DV-SAMPLE-0007', d - 200, 24000000, 'progress_billing', v_staff);

  -- 6 red, reused image (same hash as project 1 image #2)
  perform pg_temp.track(p6, 0, d - 1);
  perform pg_temp.image(p6, 1, 1, 0.0004, pg_temp.hash(p1 || '-2'));

  -- 7 red, financial progress far ahead of physical
  perform pg_temp.track(p7, 0, d - 2);
  perform pg_temp.image(p7, 1, 2);
  insert into public.disbursements (project_id, reference_no, disbursement_date, amount, billing_type, recorded_by) values
    (p7, 'DV-SAMPLE-0008', d - 55, 4380000, 'advance_payment', v_staff),
    (p7, 'DV-SAMPLE-0009', d - 10, 14600000, 'progress_billing', v_staff);

  -- 8 yellow, no 360° image yet
  perform pg_temp.track(p8, 0, d - 1);

  -- 10 suspended
  perform pg_temp.set_progress(p10, 35, d - 30);
  perform pg_temp.image(p10, 1, 25);

  -- 11 yellow, GPS about 1 km away from the project coordinates
  perform pg_temp.track(p11, 0, d - 3);
  perform pg_temp.image(p11, 1, 3, 0.0090);

  -- 12 yellow, 100% reported and completion date recorded, but no final image
  perform pg_temp.set_progress(p12, 100, d - 5);
  update public.projects set actual_completion_date = d - 5 where project_id = p12;
  perform pg_temp.image(p12, 1, 6);
end $$;

-- Final evaluation pass (also records a 'manual' evaluation row per project)
select public.evaluate_all_projects('manual');

-- ---------------------------------------------------------------------------
-- Disclosure: publish most projects and their images
-- ---------------------------------------------------------------------------
update public.projects
   set is_published = true, published_at = now(), published_by = pg_temp.uid('administrator')
 where project_code in ('OM-2026-0001', 'OM-2026-0002', 'OM-2026-0003', 'OM-2026-0004',
                        'OM-2026-0005', 'OM-2026-0008', 'OM-2026-0009', 'OM-2026-0012');

update public.site_images si
   set is_public_approved = true, approved_by = pg_temp.uid('auditor'), approved_at = now()
  from public.projects p
 where p.project_id = si.project_id and p.is_published and not si.is_reused;

-- ---------------------------------------------------------------------------
-- Audit samples (only when an auditor account exists)
-- ---------------------------------------------------------------------------
do $$
declare
  v_auditor uuid := pg_temp.uid('auditor');
  v_staff   uuid := pg_temp.uid('dpwh_personnel');
  v_finding uuid;
  v_evid    uuid;
  p4 uuid := 'b1000000-0000-4000-8000-000000000004';
  p5 uuid := 'b1000000-0000-4000-8000-000000000005';
  p6 uuid := 'b1000000-0000-4000-8000-000000000006';
begin
  if v_auditor is null then
    raise notice 'No approved auditor profile – skipping audit samples';
    return;
  end if;

  -- Project 6: reused image finding + evidence + corrective action
  insert into public.audit_findings (project_id, title, description, severity, recommendation, status, auditor_id)
  values (p6, 'Reused 360° image submitted as progress documentation',
          'The latest panorama has the same SHA-256 hash as an image previously uploaded for OM-2026-0001.',
          'high', 'Require a new on-site capture with GPS metadata and conduct a site inspection.', 'open', v_auditor)
  returning finding_id into v_finding;

  insert into public.audit_evidence (project_id, finding_id, storage_path, description, mime_type, uploaded_by)
  values (p6, v_finding, p6 || '/evidence-hash-comparison.pdf', 'Hash comparison report (sample)', 'application/pdf', v_auditor);

  insert into public.corrective_actions (finding_id, project_id, action, assigned_to, due_date, status, created_by)
  values (v_finding, p6, 'Upload a new 360° capture taken on site with GPS enabled', v_staff,
          pg_temp.today() + 7, 'pending', v_auditor);

  insert into public.audit_findings (project_id, title, description, severity, recommendation, status, is_published, auditor_id)
  values (p5, 'Project not completed by the target date',
          'Physical accomplishment is 78% while the target completion date has passed.',
          'high', 'Require a catch-up plan and evaluate liquidated damages.', 'in_progress', true, v_auditor);

  -- Confirm the red flag of project 5
  insert into public.flag_reviews (project_id, action, flag, reason, reviewed_by)
  values (p5, 'confirm', 'red', 'Target date passed; confirmed during desk review of progress reports.', v_auditor);

  -- Override the yellow (stale image) flag of project 4 with evidence
  insert into public.audit_evidence (project_id, storage_path, description, mime_type, uploaded_by)
  values (p4, p4 || '/inspection-report.pdf', 'Physical inspection report (sample)', 'application/pdf', v_auditor)
  returning evidence_id into v_evid;

  insert into public.flag_reviews (project_id, action, flag, reason, evidence_ids, reviewed_by)
  values (p4, 'override', 'green',
          'Site inspected in person; work is on schedule. New 360° capture pending due to camera repair.',
          array[v_evid], v_auditor);

  update public.projects set audit_status = 'under_review' where project_id in (p5, p6);
  update public.projects set audit_status = 'audited'      where project_id = p4;
end $$;

commit;

-- Quick look at the result
select project_code, completion_status, overall_progress, planned_progress, financial_progress,
       auto_flag, effective_flag, needs_review, is_published
from public.projects where project_code like 'OM-2026-00%' order by project_code;
