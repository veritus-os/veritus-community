begin;

create table if not exists public.import_normalization_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  source_import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_system text not null,
  source_path text,
  source_file_count integer not null default 0 check (source_file_count >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'pending' check (
    status in ('pending', 'running', 'completed', 'completed_with_errors', 'failed', 'cancelled')
  ),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.normalization_errors (
  id uuid primary key default extensions.gen_random_uuid(),
  normalization_batch_id uuid not null references public.import_normalization_batches(id) on delete cascade,
  source_import_batch_id uuid references public.import_batches(id) on delete set null,
  source_table text,
  source_id text,
  raw_row_id uuid,
  raw_payload_hash text,
  error_type text not null,
  error_message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.campuses (
  id bigserial primary key,
  source_system text not null default 'manual',
  source_table text not null default 'manual',
  source_id text unique,
  source_import_batch_id uuid references public.import_batches(id) on delete set null,
  raw_row_id uuid,
  raw_payload_hash text,
  code text not null unique,
  slug text not null unique,
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  manual_only boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_guardians (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  guardian_id bigint not null references public.guardians(id) on delete cascade,
  family_id bigint references public.families(id) on delete set null,
  relationship_type_code text,
  relationship_type_label text,
  can_pickup boolean,
  can_access_portal boolean,
  is_financial_responsible boolean,
  is_didactic_responsible boolean,
  is_primary_contact boolean not null default false,
  is_active boolean not null default true,
  needs_review boolean not null default false,
  review_note text,
  source_system text not null,
  source_table text not null,
  source_id text,
  source_import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  raw_row_id uuid not null,
  raw_payload_hash text not null,
  imported_at timestamptz not null default now(),
  unique (source_system, source_table, source_id),
  unique (student_id, guardian_id, relationship_type_code)
);

create table if not exists public.classes (
  id bigserial primary key,
  campus_id bigint references public.campuses(id) on delete set null,
  name text not null,
  course_name text,
  series_name text,
  shift_name text,
  room_name text,
  school_year integer,
  source_status_code text,
  source_status_label text,
  is_current boolean not null default true,
  is_active boolean not null default true,
  needs_review boolean not null default false,
  review_note text,
  source_system text not null,
  source_table text not null,
  source_id text,
  source_import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  raw_row_id uuid not null,
  raw_payload_hash text not null,
  imported_at timestamptz not null default now(),
  unique (source_system, source_table, source_id)
);

create table if not exists public.class_memberships (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  class_id bigint not null references public.classes(id) on delete cascade,
  enrolled_at date,
  left_at date,
  roll_number integer,
  source_status_code text,
  source_status_label text,
  is_current boolean not null default true,
  is_active boolean not null default true,
  needs_review boolean not null default false,
  review_note text,
  source_system text not null,
  source_table text not null,
  source_id text,
  source_import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  raw_row_id uuid not null,
  raw_payload_hash text not null,
  imported_at timestamptz not null default now(),
  unique (source_system, source_table, source_id),
  unique (student_id, class_id)
);

insert into public.campuses (
  source_system,
  source_table,
  source_id,
  code,
  slug,
  name,
  sort_order,
  is_active,
  manual_only,
  notes
)
values
  ('manual', 'manual', 'seed-infantil', 'INF', 'sede-infantil', 'Sede Infantil', 1, true, true, 'Manual placeholder for checkout MVP'),
  ('manual', 'manual', 'seed-fundamental', 'FUN', 'sede-fundamental', 'Sede Fundamental', 2, true, true, 'Manual placeholder for checkout MVP')
on conflict (slug) do update set
  code = excluded.code,
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  manual_only = excluded.manual_only,
  notes = excluded.notes,
  updated_at = now();

create index if not exists idx_import_normalization_batches_status
on public.import_normalization_batches(status);

create index if not exists idx_import_normalization_batches_source_import_batch
on public.import_normalization_batches(source_import_batch_id);

create index if not exists idx_normalization_errors_batch
on public.normalization_errors(normalization_batch_id);

create index if not exists idx_normalization_errors_source_table
on public.normalization_errors(source_table);

create index if not exists idx_normalization_errors_source_id
on public.normalization_errors(source_id);

create index if not exists idx_normalization_errors_raw_row_id
on public.normalization_errors(raw_row_id);

create index if not exists idx_campuses_is_active
on public.campuses(is_active);

create index if not exists idx_student_guardians_student_id
on public.student_guardians(student_id);

create index if not exists idx_student_guardians_guardian_id
on public.student_guardians(guardian_id);

create index if not exists idx_student_guardians_family_id
on public.student_guardians(family_id);

create index if not exists idx_student_guardians_is_active
on public.student_guardians(is_active);

create index if not exists idx_student_guardians_can_pickup
on public.student_guardians(can_pickup);

create index if not exists idx_student_guardians_source_id
on public.student_guardians(source_id);

create index if not exists idx_classes_campus_id
on public.classes(campus_id);

create index if not exists idx_classes_is_current
on public.classes(is_current);

create index if not exists idx_classes_is_active
on public.classes(is_active);

create index if not exists idx_classes_source_id
on public.classes(source_id);

create index if not exists idx_class_memberships_student_id
on public.class_memberships(student_id);

create index if not exists idx_class_memberships_class_id
on public.class_memberships(class_id);

create index if not exists idx_class_memberships_is_current
on public.class_memberships(is_current);

create index if not exists idx_class_memberships_is_active
on public.class_memberships(is_active);

create index if not exists idx_class_memberships_source_id
on public.class_memberships(source_id);

alter table public.import_normalization_batches enable row level security;
alter table public.normalization_errors enable row level security;
alter table public.campuses enable row level security;
alter table public.student_guardians enable row level security;
alter table public.classes enable row level security;
alter table public.class_memberships enable row level security;

drop policy if exists norm_batches_admin_select on public.import_normalization_batches;
create policy norm_batches_admin_select on public.import_normalization_batches
for select to authenticated
using (public.can_manage_sponte_staging());

drop policy if exists norm_batches_admin_insert on public.import_normalization_batches;
create policy norm_batches_admin_insert on public.import_normalization_batches
for insert to authenticated
with check (public.can_manage_sponte_staging());

drop policy if exists norm_batches_admin_update on public.import_normalization_batches;
create policy norm_batches_admin_update on public.import_normalization_batches
for update to authenticated
using (public.can_manage_sponte_staging())
with check (public.can_manage_sponte_staging());

drop policy if exists norm_batches_admin_delete on public.import_normalization_batches;
create policy norm_batches_admin_delete on public.import_normalization_batches
for delete to authenticated
using (public.can_manage_sponte_staging());

drop policy if exists norm_batches_service_all on public.import_normalization_batches;
create policy norm_batches_service_all on public.import_normalization_batches
for all to service_role
using (true)
with check (true);

drop policy if exists norm_errors_admin_select on public.normalization_errors;
create policy norm_errors_admin_select on public.normalization_errors
for select to authenticated
using (public.can_manage_sponte_staging());

drop policy if exists norm_errors_admin_insert on public.normalization_errors;
create policy norm_errors_admin_insert on public.normalization_errors
for insert to authenticated
with check (public.can_manage_sponte_staging());

drop policy if exists norm_errors_admin_update on public.normalization_errors;
create policy norm_errors_admin_update on public.normalization_errors
for update to authenticated
using (public.can_manage_sponte_staging())
with check (public.can_manage_sponte_staging());

drop policy if exists norm_errors_admin_delete on public.normalization_errors;
create policy norm_errors_admin_delete on public.normalization_errors
for delete to authenticated
using (public.can_manage_sponte_staging());

drop policy if exists norm_errors_service_all on public.normalization_errors;
create policy norm_errors_service_all on public.normalization_errors
for all to service_role
using (true)
with check (true);

drop policy if exists campuses_read_staff on public.campuses;
create policy campuses_read_staff on public.campuses
for select to authenticated
using (public.is_school_staff());

drop policy if exists campuses_service_all on public.campuses;
create policy campuses_service_all on public.campuses
for all to service_role
using (true)
with check (true);

drop policy if exists student_guardians_read_staff on public.student_guardians;
create policy student_guardians_read_staff on public.student_guardians
for select to authenticated
using (public.is_school_staff());

drop policy if exists student_guardians_service_all on public.student_guardians;
create policy student_guardians_service_all on public.student_guardians
for all to service_role
using (true)
with check (true);

drop policy if exists classes_read_staff on public.classes;
create policy classes_read_staff on public.classes
for select to authenticated
using (public.is_school_staff());

drop policy if exists classes_service_all on public.classes;
create policy classes_service_all on public.classes
for all to service_role
using (true)
with check (true);

drop policy if exists class_memberships_read_staff on public.class_memberships;
create policy class_memberships_read_staff on public.class_memberships
for select to authenticated
using (public.is_school_staff());

drop policy if exists class_memberships_service_all on public.class_memberships;
create policy class_memberships_service_all on public.class_memberships
for all to service_role
using (true)
with check (true);

commit;
