begin;

alter table public.student_checkout_daily
  drop constraint if exists student_checkout_daily_student_id_fkey;

alter table public.student_checkout_daily
  drop constraint if exists student_checkout_daily_pickup_guardian_id_fkey;

alter table public.student_checkout_logs
  drop constraint if exists student_checkout_logs_student_id_fkey;

alter table public.student_checkout_logs
  drop constraint if exists student_checkout_logs_pickup_guardian_id_fkey;

alter table public.student_checkout_daily
  add column if not exists source_system text not null default 'sponte',
  add column if not exists source_table text not null default 'checkout_active_students_view',
  add column if not exists source_id text,
  add column if not exists source_import_batch_id uuid references public.import_batches(id) on delete set null,
  add column if not exists raw_row_id uuid,
  add column if not exists raw_payload_hash text,
  add column if not exists authorized_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists authorized_by_name text;

alter table public.student_checkout_logs
  add column if not exists source_system text not null default 'sponte',
  add column if not exists source_table text not null default 'checkout_active_students_view',
  add column if not exists source_id text,
  add column if not exists source_import_batch_id uuid references public.import_batches(id) on delete set null,
  add column if not exists raw_row_id uuid,
  add column if not exists raw_payload_hash text,
  add column if not exists authorized_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists authorized_by_name text;

create index if not exists idx_student_checkout_daily_source_id
on public.student_checkout_daily(source_id);

create index if not exists idx_student_checkout_daily_source_import_batch
on public.student_checkout_daily(source_import_batch_id);

create index if not exists idx_student_checkout_logs_source_id
on public.student_checkout_logs(source_id);

create index if not exists idx_student_checkout_logs_source_import_batch
on public.student_checkout_logs(source_import_batch_id);

create index if not exists idx_student_checkout_logs_created_at
on public.student_checkout_logs(created_at desc);

commit;
