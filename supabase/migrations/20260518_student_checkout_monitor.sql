begin;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_checkout_status_enum') THEN
    CREATE TYPE public.student_checkout_status_enum AS ENUM (
      'at_school',
      'absent',
      'guardian_arrived',
      'preparing_release',
      'ready_for_pickup',
      'released_from_classroom',
      'left_school',
      'needs_verification'
    );
  END IF;
END $$;

create table if not exists public.activity_tags (
  id bigserial primary key,
  slug text not null unique,
  label text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_activity_tags (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  activity_tag_id bigint not null references public.activity_tags(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, activity_tag_id)
);

create table if not exists public.student_checkout_daily (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  checkout_date date not null default current_date,
  campus_name text not null check (campus_name in ('Sede Infantil', 'Sede Fundamental')),
  class_name_snapshot text,
  status public.student_checkout_status_enum not null default 'at_school',
  pickup_guardian_id bigint references public.guardians(id) on delete set null,
  pickup_guardian_name text,
  pickup_person_name text,
  note text,
  verification_note text,
  guardian_arrived_at timestamptz,
  guardian_arrived_by_user_id uuid references public.profiles(id) on delete set null,
  guardian_arrived_by_name text,
  ready_for_pickup_at timestamptz,
  ready_for_pickup_by_user_id uuid references public.profiles(id) on delete set null,
  ready_for_pickup_by_name text,
  released_from_classroom_at timestamptz,
  released_from_classroom_by_user_id uuid references public.profiles(id) on delete set null,
  released_from_classroom_by_name text,
  left_school_at timestamptz,
  left_school_by_user_id uuid references public.profiles(id) on delete set null,
  left_school_by_name text,
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  updated_by_name text,
  device_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, checkout_date)
);

create index if not exists idx_student_checkout_daily_date_status
on public.student_checkout_daily(checkout_date, status, campus_name);

create table if not exists public.student_checkout_logs (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  checkout_date date not null,
  previous_status public.student_checkout_status_enum,
  new_status public.student_checkout_status_enum not null,
  changed_by_user_id uuid references public.profiles(id) on delete set null,
  changed_by_name text,
  campus_name text,
  device_label text,
  pickup_guardian_id bigint references public.guardians(id) on delete set null,
  pickup_guardian_name text,
  pickup_person_name text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_checkout_logs_student_date
on public.student_checkout_logs(student_id, checkout_date, created_at desc);

insert into public.activity_tags (slug, label)
values
  ('ballet', 'Ballet'),
  ('judo', 'Judô'),
  ('soccer', 'Futebol'),
  ('catechism', 'Catequese'),
  ('after_school', 'Plantão'),
  ('other', 'Outras atividades')
on conflict (slug) do update set label = excluded.label, updated_at = now();

alter table public.activity_tags enable row level security;
alter table public.student_activity_tags enable row level security;
alter table public.student_checkout_daily enable row level security;
alter table public.student_checkout_logs enable row level security;

alter table public.attendance enable row level security;

drop policy if exists mvp_read_activity_tags on public.activity_tags;
create policy mvp_read_activity_tags on public.activity_tags for select to anon, authenticated using (true);

drop policy if exists mvp_manage_activity_tags on public.activity_tags;
create policy mvp_manage_activity_tags on public.activity_tags for all to authenticated using (true) with check (true);

drop policy if exists mvp_read_student_activity_tags on public.student_activity_tags;
create policy mvp_read_student_activity_tags on public.student_activity_tags for select to anon, authenticated using (true);

drop policy if exists mvp_manage_student_activity_tags on public.student_activity_tags;
create policy mvp_manage_student_activity_tags on public.student_activity_tags for all to authenticated using (true) with check (true);

drop policy if exists mvp_read_student_checkout_daily on public.student_checkout_daily;
create policy mvp_read_student_checkout_daily on public.student_checkout_daily for select to anon, authenticated using (true);

drop policy if exists mvp_manage_student_checkout_daily on public.student_checkout_daily;
create policy mvp_manage_student_checkout_daily on public.student_checkout_daily for all to authenticated using (true) with check (true);

drop policy if exists mvp_read_student_checkout_logs on public.student_checkout_logs;
create policy mvp_read_student_checkout_logs on public.student_checkout_logs for select to anon, authenticated using (true);

drop policy if exists mvp_insert_student_checkout_logs on public.student_checkout_logs;
create policy mvp_insert_student_checkout_logs on public.student_checkout_logs for insert to authenticated with check (true);

drop policy if exists mvp_manage_attendance on public.attendance;
create policy mvp_manage_attendance on public.attendance for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.student_checkout_daily;
alter publication supabase_realtime add table public.student_checkout_logs;

commit;
