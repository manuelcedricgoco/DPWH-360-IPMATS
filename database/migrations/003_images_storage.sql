-- =============================================================================
-- DPWH 360° – 003_images_storage.sql
-- Phase 3: 360° site images, project documents, Supabase Storage buckets and
-- storage.objects policies.
--
-- Object naming convention (all buckets):  {project_id}/{uuid}.{ext}
-- site_images.storage_path / project_documents.storage_path hold that object
-- name (without the bucket). The frontend calls createSignedUrl() and hands the
-- URL to Pannellum.
-- =============================================================================

-- Great-circle distance in metres (haversine), no PostGIS needed.
create or replace function public.distance_m(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
returns numeric
language sql immutable
set search_path = ''
as $$
  select case when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
  else round((2 * 6371000 * asin(sqrt(
           power(sin(radians((lat2 - lat1)::float8) / 2), 2)
         + cos(radians(lat1::float8)) * cos(radians(lat2::float8))
         * power(sin(radians((lng2 - lng1)::float8) / 2), 2))))::numeric, 1)
  end;
$$;

-- ---------------------------------------------------------------------------
-- 360° site images
-- ---------------------------------------------------------------------------
create table public.site_images (
  image_id             uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects (project_id) on delete cascade,
  phase_id             uuid,
  storage_path         text not null unique,
  mime_type            text check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes      bigint check (file_size_bytes is null or file_size_bytes > 0),
  sha256               text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  captured_at          timestamptz,                 -- EXIF DateTimeOriginal
  inspection_date      date not null default current_date,
  gps_lat              numeric(9,6) check (gps_lat between -90 and 90),
  gps_lng              numeric(9,6) check (gps_lng between -180 and 180),
  is_final             boolean not null default false,  -- final/as-built completion image
  caption              text,

  -- Computed by trigger (not writable from the API)
  distance_from_site_m numeric,
  is_reused            boolean not null default false,
  reused_from_image_id uuid references public.site_images (image_id) on delete set null,

  -- Public disclosure (auditor / admin)
  is_public_approved   boolean not null default false,
  approved_by          uuid references public.profiles (id),
  approved_at          timestamptz,

  uploaded_by          uuid references public.profiles (id) default auth.uid(),
  uploaded_at          timestamptz not null default now(),

  constraint site_images_phase_fk foreign key (project_id, phase_id)
    references public.project_phases (project_id, phase_id) on delete set null (phase_id),
  constraint site_images_path_in_project_folder
    check (storage_path like project_id::text || '/%'),
  constraint site_images_captured_not_future
    check (captured_at is null or captured_at <= uploaded_at + interval '1 day')
);
create index site_images_project_idx     on public.site_images (project_id, inspection_date desc, uploaded_at desc);
create index site_images_phase_idx       on public.site_images (project_id, phase_id);
create index site_images_sha256_idx      on public.site_images (sha256);
create index site_images_reused_from_idx on public.site_images (reused_from_image_id);
create index site_images_uploaded_by_idx on public.site_images (uploaded_by);
create index site_images_approved_by_idx on public.site_images (approved_by);

-- Distance from the registered project coordinates + reused-image detection.
create or replace function public.site_images_compute()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_lat numeric;
  v_lng numeric;
begin
  select latitude, longitude into v_lat, v_lng
  from public.projects where project_id = new.project_id;

  new.distance_from_site_m := public.distance_m(new.gps_lat, new.gps_lng, v_lat, v_lng);

  if tg_op = 'INSERT' or new.sha256 is distinct from old.sha256 then
    select image_id into new.reused_from_image_id
    from public.site_images
    where sha256 = new.sha256 and image_id <> new.image_id
    order by uploaded_at
    limit 1;
    new.is_reused := new.reused_from_image_id is not null;
  end if;
  return new;
end $$;

create trigger trg_site_images_compute
  before insert or update of gps_lat, gps_lng, sha256, project_id on public.site_images
  for each row execute function public.site_images_compute();

-- ---------------------------------------------------------------------------
-- Project documents (contracts, NTP, progress reports, financial docs ...)
-- ---------------------------------------------------------------------------
create table public.project_documents (
  document_id     uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (project_id) on delete cascade,
  doc_type        text not null default 'other'
                  check (doc_type in ('contract', 'notice_to_proceed', 'program_of_work',
                                      'progress_report', 'billing', 'disbursement_voucher',
                                      'variation_order', 'inspection_report',
                                      'completion_certificate', 'other')),
  title           text not null check (length(trim(title)) > 0),
  storage_path    text not null unique,
  mime_type       text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  sha256          text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  is_public       boolean not null default false,
  uploaded_by     uuid references public.profiles (id) default auth.uid(),
  uploaded_at     timestamptz not null default now(),
  constraint project_documents_path_in_project_folder
    check (storage_path like project_id::text || '/%')
);
create index project_documents_project_idx  on public.project_documents (project_id, doc_type);
create index project_documents_uploader_idx on public.project_documents (uploaded_by);

-- Link financial records to their supporting documents.
alter table public.variation_orders      add constraint variation_orders_document_fk  foreign key (document_id) references public.project_documents (document_id) on delete set null;
alter table public.financial_obligations add constraint obligations_document_fk       foreign key (document_id) references public.project_documents (document_id) on delete set null;
alter table public.disbursements         add constraint disbursements_document_fk     foreign key (document_id) references public.project_documents (document_id) on delete set null;
alter table public.reported_expenses     add constraint reported_expenses_document_fk foreign key (document_id) references public.project_documents (document_id) on delete set null;
create index variation_orders_document_idx on public.variation_orders (document_id);
create index obligations_document_idx      on public.financial_obligations (document_id);
create index disbursements_document_idx    on public.disbursements (document_id);
create index expenses_document_idx         on public.reported_expenses (document_id);

alter table public.site_images       enable row level security;
alter table public.project_documents enable row level security;

-- ---------------------------------------------------------------------------
-- Storage buckets (all private; access through signed URLs + RLS)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('panoramas',         'panoramas',         false, 31457280, array['image/jpeg', 'image/png', 'image/webp']),
  ('project-documents', 'project-documents', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('audit-evidence',    'audit-evidence',    false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Helpers for storage policies (SECURITY DEFINER: they read RLS-protected tables).
create or replace function public.storage_project_exists(p_object_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects
    where project_id::text = (storage.foldername(p_object_name))[1]
      and deleted_at is null
  );
$$;

create or replace function public.public_can_view_image(p_object_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.site_images si
    join public.projects p on p.project_id = si.project_id
    where si.storage_path = p_object_name
      and si.is_public_approved
      and p.is_published and p.deleted_at is null
  );
$$;

create or replace function public.public_can_view_document(p_object_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_documents d
    join public.projects p on p.project_id = d.project_id
    where d.storage_path = p_object_name
      and d.is_public
      and p.is_published and p.deleted_at is null
  );
$$;

-- Read
create policy "dpwh360 staff read files" on storage.objects
  for select to authenticated
  using (bucket_id in ('panoramas', 'project-documents', 'audit-evidence') and public.is_staff());

create policy "dpwh360 public read approved panoramas" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'panoramas' and public.public_can_view_image(name));

create policy "dpwh360 public read public documents" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'project-documents' and public.public_can_view_document(name));

-- Upload
create policy "dpwh360 personnel upload site files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('panoramas', 'project-documents')
    and public.has_role('administrator', 'dpwh_personnel')
    and public.storage_project_exists(name)
  );

create policy "dpwh360 auditors upload evidence" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'audit-evidence'
    and public.has_role('administrator', 'auditor')
    and public.storage_project_exists(name)
  );

-- Files are immutable: no UPDATE policy. Only administrators may delete.
create policy "dpwh360 admin delete files" on storage.objects
  for delete to authenticated
  using (bucket_id in ('panoramas', 'project-documents', 'audit-evidence')
         and public.has_role('administrator'));
