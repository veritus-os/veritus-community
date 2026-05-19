begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.can_manage_sponte_staging()
returns boolean
language sql
stable
as $$
  select
    auth.role() = 'service_role'
    or coalesce(public.current_app_access_type(), '') in ('super_admin', 'admin', 'administrador');
$$;

create table if not exists public.import_batches (
  id uuid primary key default extensions.gen_random_uuid(),
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

create table if not exists public.import_errors (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_file text,
  source_row_number integer,
  source_table text,
  error_type text not null,
  error_message text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_import_batches_status
on public.import_batches(status);

create index if not exists idx_import_batches_started_at
on public.import_batches(started_at desc);

create index if not exists idx_import_batches_created_by
on public.import_batches(created_by);

create index if not exists idx_import_errors_batch
on public.import_errors(import_batch_id);

create index if not exists idx_import_errors_source_table
on public.import_errors(source_table);

create index if not exists idx_import_errors_source_file_row
on public.import_errors(source_file, source_row_number);

alter table public.import_batches enable row level security;
alter table public.import_errors enable row level security;

drop policy if exists sponte_import_batches_admin_select on public.import_batches;
create policy sponte_import_batches_admin_select on public.import_batches
for select to authenticated
using (public.can_manage_sponte_staging());

drop policy if exists sponte_import_batches_admin_insert on public.import_batches;
create policy sponte_import_batches_admin_insert on public.import_batches
for insert to authenticated
with check (public.can_manage_sponte_staging());

drop policy if exists sponte_import_batches_admin_update on public.import_batches;
create policy sponte_import_batches_admin_update on public.import_batches
for update to authenticated
using (public.can_manage_sponte_staging())
with check (public.can_manage_sponte_staging());

drop policy if exists sponte_import_batches_admin_delete on public.import_batches;
create policy sponte_import_batches_admin_delete on public.import_batches
for delete to authenticated
using (public.can_manage_sponte_staging());

drop policy if exists sponte_import_batches_service_all on public.import_batches;
create policy sponte_import_batches_service_all on public.import_batches
for all to service_role
using (true)
with check (true);

drop policy if exists sponte_import_errors_admin_select on public.import_errors;
create policy sponte_import_errors_admin_select on public.import_errors
for select to authenticated
using (public.can_manage_sponte_staging());

drop policy if exists sponte_import_errors_admin_insert on public.import_errors;
create policy sponte_import_errors_admin_insert on public.import_errors
for insert to authenticated
with check (public.can_manage_sponte_staging());

drop policy if exists sponte_import_errors_admin_update on public.import_errors;
create policy sponte_import_errors_admin_update on public.import_errors
for update to authenticated
using (public.can_manage_sponte_staging())
with check (public.can_manage_sponte_staging());

drop policy if exists sponte_import_errors_admin_delete on public.import_errors;
create policy sponte_import_errors_admin_delete on public.import_errors
for delete to authenticated
using (public.can_manage_sponte_staging());

drop policy if exists sponte_import_errors_service_all on public.import_errors;
create policy sponte_import_errors_service_all on public.import_errors
for all to service_role
using (true)
with check (true);

commit;
