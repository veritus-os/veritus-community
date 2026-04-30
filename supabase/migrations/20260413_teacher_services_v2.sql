-- 20260413_teacher_services_v2.sql
-- Novos recursos: presenca, conteudo de professores e servicos extras.

begin;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
    CREATE TYPE public.attendance_status_enum AS ENUM ('presente', 'ausente');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'teacher_content_status_enum') THEN
    CREATE TYPE public.teacher_content_status_enum AS ENUM ('rascunho', 'publicado');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extra_service_type_enum') THEN
    CREATE TYPE public.extra_service_type_enum AS ENUM ('almoço', 'lanche_manha', 'lanche_tarde');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extra_service_frequency_enum') THEN
    CREATE TYPE public.extra_service_frequency_enum AS ENUM ('diário', 'semanal', 'mensal');
  END IF;
END $$;

-- Professores
create table if not exists public.teachers (
  id bigserial primary key,
  full_name text not null,
  email text unique,
  subject_area text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Apoio para relatorio por turma
alter table public.students
  add column if not exists class_name text;

-- 1) attendance
create table if not exists public.attendance (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  attendance_date date not null,
  status public.attendance_status_enum not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

create index if not exists idx_attendance_student_date
on public.attendance(student_id, attendance_date);

-- 2) teacher_contents
create table if not exists public.teacher_contents (
  id bigserial primary key,
  teacher_id bigint not null references public.teachers(id) on delete cascade,
  title text not null,
  description text,
  file_url text,
  status public.teacher_content_status_enum not null default 'rascunho',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_contents_teacher
on public.teacher_contents(teacher_id);

-- 3) extra_services
create table if not exists public.extra_services (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  service_type public.extra_service_type_enum not null,
  frequency public.extra_service_frequency_enum not null,
  price numeric(10,2) not null check (price >= 0),
  active boolean not null default true,
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_extra_services_student
on public.extra_services(student_id);

-- 4) view_daily_kitchen_report
create or replace view public.view_daily_kitchen_report as
with active_today as (
  select
    es.student_id,
    es.service_type,
    es.frequency,
    es.price
  from public.extra_services es
  where es.active = true
    and (
      es.frequency = 'diário'
      or (es.frequency = 'semanal' and extract(dow from current_date) = extract(dow from es.start_date))
      or (es.frequency = 'mensal' and extract(day from current_date) = extract(day from es.start_date))
    )
)
select
  s.id as student_id,
  s.full_name as student_name,
  coalesce(s.class_name, 'Nao informada') as class_name,
  sum((at.service_type = 'almoço')::int) as total_almoco,
  sum((at.service_type in ('lanche_manha', 'lanche_tarde'))::int) as total_lanches,
  count(at.service_type) as total_servicos_hoje,
  coalesce(sum(at.price), 0)::numeric(10,2) as valor_total_hoje
from public.students s
join active_today at on at.student_id = s.id
group by s.id, s.full_name, s.class_name
order by class_name, student_name;

grant select on public.view_daily_kitchen_report to anon, authenticated;

-- RLS
alter table public.teachers enable row level security;
alter table public.attendance enable row level security;
alter table public.teacher_contents enable row level security;
alter table public.extra_services enable row level security;

-- Politicas MVP
drop policy if exists mvp_read_teachers on public.teachers;
create policy mvp_read_teachers on public.teachers for select to anon, authenticated using (true);

drop policy if exists mvp_read_attendance on public.attendance;
create policy mvp_read_attendance on public.attendance for select to anon, authenticated using (true);

drop policy if exists mvp_read_teacher_contents on public.teacher_contents;
create policy mvp_read_teacher_contents on public.teacher_contents for select to anon, authenticated using (true);

drop policy if exists mvp_read_extra_services on public.extra_services;
create policy mvp_read_extra_services on public.extra_services for select to anon, authenticated using (true);

commit;
