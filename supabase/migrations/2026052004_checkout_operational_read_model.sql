begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.checkout_class_campus_assignments (
  source_class_id bigint primary key,
  campus_id bigint references public.campuses(id) on delete set null,
  campus_name_override text,
  needs_review boolean not null default true,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_checkout_class_campus_assignments_campus_id
on public.checkout_class_campus_assignments(campus_id);

alter table public.checkout_class_campus_assignments enable row level security;

drop policy if exists checkout_class_campus_assignments_read_staff on public.checkout_class_campus_assignments;
create policy checkout_class_campus_assignments_read_staff on public.checkout_class_campus_assignments
for select to authenticated
using (public.is_school_staff());

drop policy if exists checkout_class_campus_assignments_service_all on public.checkout_class_campus_assignments;
create policy checkout_class_campus_assignments_service_all on public.checkout_class_campus_assignments
for all to service_role
using (true)
with check (true);

create or replace function public.checkout_active_classes_snapshot()
returns table (
  source_class_id bigint,
  source_system text,
  source_table text,
  source_id text,
  source_import_batch_id uuid,
  raw_row_id uuid,
  raw_payload_hash text,
  class_name text,
  school_year integer,
  course_id bigint,
  course_name text,
  shift_id bigint,
  shift_name text,
  room_id bigint,
  room_name text,
  campus_id bigint,
  campus_name text,
  campus_assignment_status text,
  active_student_count integer,
  active_membership_count integer,
  is_active boolean,
  is_current boolean,
  needs_review boolean,
  review_note text
)
language sql
stable
security definer
set search_path = public
as $$
  with active_classes as (
    select
      c.turma_id,
      c.import_batch_id,
      c.id as raw_row_id,
      c.row_hash as raw_payload_hash,
      c.raw_payload,
      c.source_file,
      c.source_sheet,
      c.source_row_number,
      c.raw_payload ->> 'Nome' as class_name,
      nullif(btrim(c.raw_payload ->> 'AnoLetivo'), '')::integer as school_year,
      nullif(btrim(c.raw_payload ->> 'CursoID'), '')::bigint as course_id,
      nullif(btrim(c.raw_payload ->> 'TurnoID'), '')::bigint as shift_id,
      nullif(btrim(c.raw_payload ->> 'SalaID'), '')::bigint as room_id,
      c.raw_payload ->> 'Situacao' as source_status_code,
      c.raw_payload ->> 'ce' as ce_text
    from public.sponte_raw_turmas c
    where nullif(btrim(c.raw_payload ->> 'AnoLetivo'), '') = '2026'
      and nullif(btrim(c.raw_payload ->> 'Situacao'), '') = '-1'
  ),
  active_memberships as (
    select
      m.turma_aluno_id,
      nullif(btrim(m.raw_payload ->> 'TurmaID'), '')::bigint as turma_id,
      nullif(btrim(m.raw_payload ->> 'AlunoID'), '')::bigint as aluno_id,
      m.raw_payload,
      m.row_hash as raw_payload_hash,
      m.import_batch_id,
      m.id as raw_row_id,
      m.source_file,
      m.source_sheet,
      m.source_row_number
    from public.sponte_raw_turma_alunos m
    join active_classes c on c.turma_id = nullif(btrim(m.raw_payload ->> 'TurmaID'), '')::bigint
    where coalesce(nullif(btrim(m.raw_payload ->> 'Removido'), ''), '0') = '0'
  ),
  membership_counts as (
    select turma_id, count(*)::integer as active_membership_count
    from active_memberships
    group by turma_id
  )
  select
    c.turma_id as source_class_id,
    'sponte'::text as source_system,
    'sponte_raw_turmas'::text as source_table,
    c.turma_id::text as source_id,
    c.import_batch_id as source_import_batch_id,
    c.raw_row_id,
    c.raw_payload_hash,
    c.class_name,
    c.school_year,
    c.course_id,
    coalesce(course.raw_payload ->> 'Nome', course.raw_payload ->> 'Descricao', course.raw_payload ->> 'Sigla', c.course_id::text) as course_name,
    c.shift_id,
    coalesce(shift.raw_payload ->> 'Nome', shift.raw_payload ->> 'Descricao', shift.raw_payload ->> 'Sigla', c.shift_id::text) as shift_name,
    c.room_id,
    coalesce(room.raw_payload ->> 'Nome', room.raw_payload ->> 'Descricao', room.raw_payload ->> 'Sigla', c.room_id::text) as room_name,
    campus.id as campus_id,
    coalesce(map.campus_name_override, campus.name, 'Campus pendente') as campus_name,
    case
      when map.source_class_id is null then 'pending'
      when campus.id is null then 'mapped_without_campus'
      else 'mapped'
    end as campus_assignment_status,
    coalesce(student_counts.active_student_count, 0)::integer as active_student_count,
    coalesce(membership_counts.active_membership_count, 0)::integer as active_membership_count,
    true as is_active,
    true as is_current,
    (map.source_class_id is null or campus.id is null) as needs_review,
    case
      when map.source_class_id is null then 'Campus manual ainda não atribuída'
      when campus.id is null then 'Campus manual inválida ou ausente'
      else null
    end as review_note
  from active_classes c
  left join public.checkout_class_campus_assignments map
    on map.source_class_id = c.turma_id
  left join public.campuses campus
    on campus.id = map.campus_id
  left join public.sponte_raw_cursos course
    on course.curso_id = c.course_id
  left join public.sponte_raw_turnos shift
    on shift.turno_id = c.shift_id
  left join public.sponte_raw_salas room
    on room.sala_id = c.room_id
  left join membership_counts
    on membership_counts.turma_id = c.turma_id
  left join (
    select
      m.turma_id,
      count(distinct m.aluno_id)::integer as active_student_count
    from active_memberships m
    group by m.turma_id
  ) student_counts on student_counts.turma_id = c.turma_id
  order by c.class_name, c.turma_id;
$$;

create or replace view public.checkout_active_classes_view as
select * from public.checkout_active_classes_snapshot();

create or replace function public.checkout_active_guardians_snapshot()
returns table (
  source_student_id bigint,
  source_guardian_id bigint,
  source_student_guardian_id bigint,
  source_system text,
  source_table text,
  source_id text,
  source_import_batch_id uuid,
  raw_row_id uuid,
  raw_payload_hash text,
  student_name text,
  guardian_name text,
  relationship_type_code text,
  relationship_type_label text,
  can_pickup boolean,
  can_access_portal boolean,
  is_financial_responsible boolean,
  is_didactic_responsible boolean,
  is_primary_contact boolean,
  is_review boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with active_students as (
    select
      s.aluno_id,
      s.raw_payload ->> 'Nome' as student_name,
      s.raw_payload ->> 'ResponsavelFinanceiroID' as financial_guardian_id,
      s.raw_payload ->> 'ResponsavelDidaticoID' as didactic_guardian_id
    from public.sponte_raw_alunos_empresas s
    where nullif(btrim(s.raw_payload ->> 'SituacaoAlunoID'), '') = '-1'
  )
  select
    a.aluno_id as source_student_id,
    r.responsavel_id as source_guardian_id,
    ar.aluno_responsavel_id as source_student_guardian_id,
    'sponte'::text as source_system,
    'sponte_raw_alunos_responsaveis'::text as source_table,
    ar.aluno_responsavel_id::text as source_id,
    ar.import_batch_id as source_import_batch_id,
    ar.id as raw_row_id,
    ar.row_hash as raw_payload_hash,
    a.student_name,
    coalesce(r.raw_payload ->> 'Nome', r.raw_payload ->> 'NomeSocial', r.raw_payload ->> 'Razao', r.responsavel_id::text) as guardian_name,
    nullif(btrim(ar.raw_payload ->> 'TipoResponsavelID'), '') as relationship_type_code,
    nullif(btrim(ar.raw_payload ->> 'TipoResponsavel'), '') as relationship_type_label,
    coalesce(nullif(btrim(ar.raw_payload ->> 'PodeRetirarAluno'), ''), '0') = '1' as can_pickup,
    coalesce(nullif(btrim(ar.raw_payload ->> 'PodeAcessarPortal'), ''), '0') = '1' as can_access_portal,
    a.financial_guardian_id is not null and nullif(btrim(a.financial_guardian_id), '')::bigint = r.responsavel_id as is_financial_responsible,
    a.didactic_guardian_id is not null and nullif(btrim(a.didactic_guardian_id), '')::bigint = r.responsavel_id as is_didactic_responsible,
    lower(coalesce(nullif(btrim(ar.raw_payload ->> 'PodeRetirarAluno'), ''), '0')) = '1' as is_primary_contact,
    false as is_review
  from public.sponte_raw_alunos_responsaveis ar
  join active_students a
    on a.aluno_id = nullif(btrim(ar.raw_payload ->> 'AlunoID'), '')::bigint
  join public.sponte_raw_responsaveis r
    on r.responsavel_id = nullif(btrim(ar.raw_payload ->> 'ResponsavelID'), '')::bigint
  where coalesce(nullif(btrim(ar.raw_payload ->> 'PodeRetirarAluno'), ''), '0') = '1'
  order by a.student_name, guardian_name;
$$;

create or replace view public.checkout_active_guardians_view as
select * from public.checkout_active_guardians_snapshot();

create or replace function public.checkout_active_students_snapshot()
returns table (
  student_id bigint,
  full_name text,
  class_id bigint,
  class_name text,
  campus_id bigint,
  campus_name text,
  family_name text,
  attendance_status text,
  status text,
  activities jsonb,
  authorized_guardians jsonb,
  pickup_person_name text,
  pickup_guardian_id bigint,
  pickup_guardian_name text,
  note text,
  verification_note text,
  guardian_arrived_at timestamptz,
  guardian_arrived_by_name text,
  ready_for_pickup_at timestamptz,
  ready_for_pickup_by_name text,
  released_from_classroom_at timestamptz,
  released_from_classroom_by_name text,
  left_school_at timestamptz,
  left_school_by_name text,
  updated_at timestamptz,
  updated_by_name text,
  is_active_student boolean,
  is_active_membership boolean,
  has_multiple_active_memberships boolean,
  needs_review boolean,
  source_system text,
  source_table text,
  source_id text,
  source_import_batch_id uuid,
  raw_row_id uuid,
  raw_payload_hash text
)
language sql
stable
security definer
set search_path = public
as $$
  with active_students as (
    select
      s.aluno_id,
      s.import_batch_id,
      s.id as raw_row_id,
      s.row_hash as raw_payload_hash,
      s.raw_payload,
      s.raw_payload ->> 'Nome' as full_name,
      s.raw_payload ->> 'ResponsavelFinanceiroID' as financial_guardian_id,
      s.raw_payload ->> 'ResponsavelDidaticoID' as didactic_guardian_id
    from public.sponte_raw_alunos_empresas s
    where nullif(btrim(s.raw_payload ->> 'SituacaoAlunoID'), '') = '-1'
  ),
  active_memberships as (
    select
      m.aluno_id,
      m.turma_id,
      m.import_batch_id,
      m.id as raw_row_id,
      m.row_hash as raw_payload_hash,
      m.raw_payload,
      c.raw_payload ->> 'Nome' as class_name,
      c.raw_payload ->> 'AnoLetivo' as school_year,
      c.raw_payload ->> 'TurmaID' as source_class_id,
      c.raw_payload ->> 'Situacao' as class_status,
      c.raw_payload ->> 'CursoID' as course_id,
      c.raw_payload ->> 'TurnoID' as shift_id,
      c.raw_payload ->> 'SalaID' as room_id,
      c.import_batch_id as class_import_batch_id,
      c.id as class_raw_row_id,
      c.row_hash as class_raw_payload_hash
    from public.sponte_raw_turma_alunos m
    join public.sponte_raw_turmas c
      on c.turma_id = nullif(btrim(m.raw_payload ->> 'TurmaID'), '')::bigint
    where coalesce(nullif(btrim(m.raw_payload ->> 'Removido'), ''), '0') = '0'
      and nullif(btrim(c.raw_payload ->> 'AnoLetivo'), '') = '2026'
      and nullif(btrim(c.raw_payload ->> 'Situacao'), '') = '-1'
  ),
  active_membership_counts as (
    select aluno_id, count(*)::integer as active_membership_count
    from active_memberships
    group by aluno_id
  ),
  active_guardians as (
    select
      g.source_student_id as aluno_id,
      jsonb_agg(
        jsonb_build_object(
          'id', g.source_guardian_id,
          'full_name', g.guardian_name,
          'can_pickup', g.can_pickup,
          'relationship_type_code', g.relationship_type_code,
          'relationship_type_label', g.relationship_type_label,
          'is_financial_responsible', g.is_financial_responsible,
          'is_didactic_responsible', g.is_didactic_responsible,
          'is_primary_contact', g.is_primary_contact
        )
        order by g.guardian_name
      ) as guardians_json,
      count(*)::integer as guardian_count
    from public.checkout_active_guardians_snapshot() g
    group by g.source_student_id
  ),
  current_checkout as (
    select *
    from public.student_checkout_daily
    where checkout_date = current_date
  ),
  active_class_lookup as (
    select
      a.aluno_id,
      a.turma_id as class_id,
      coalesce(map.campus_name_override, campus.name, 'Campus pendente') as campus_name,
      campus.id as campus_id
    from active_memberships a
    left join public.checkout_class_campus_assignments map
      on map.source_class_id = a.turma_id
    left join public.campuses campus
      on campus.id = map.campus_id
  ),
  student_class_choice as (
    select distinct on (aluno_id)
      aluno_id,
      class_id,
      campus_id,
      campus_name
    from active_class_lookup
    order by aluno_id, class_id
  )
  select
    s.aluno_id as student_id,
    s.full_name,
    sc.class_id,
    c.raw_payload ->> 'Nome' as class_name,
    sc.campus_id,
    sc.campus_name,
    coalesce(ag.guardians_json->0->>'full_name', nullif(btrim(s.raw_payload ->> 'ResponsavelFinanceiroNome'), ''), nullif(btrim(s.raw_payload ->> 'ResponsavelDidaticoNome'), ''), 'Família sem nome') as family_name,
    case when coalesce(cc.status, 'at_school') = 'absent' then 'absent' else 'present' end as attendance_status,
    coalesce(cc.status, 'at_school') as status,
    '[]'::jsonb as activities,
    coalesce(ag.guardians_json, '[]'::jsonb) as authorized_guardians,
    coalesce(cc.pickup_person_name, '') as pickup_person_name,
    cc.pickup_guardian_id,
    coalesce(cc.pickup_guardian_name, '') as pickup_guardian_name,
    coalesce(cc.note, '') as note,
    coalesce(cc.verification_note, '') as verification_note,
    cc.guardian_arrived_at,
    coalesce(cc.guardian_arrived_by_name, '') as guardian_arrived_by_name,
    cc.ready_for_pickup_at,
    coalesce(cc.ready_for_pickup_by_name, '') as ready_for_pickup_by_name,
    cc.released_from_classroom_at,
    coalesce(cc.released_from_classroom_by_name, '') as released_from_classroom_by_name,
    cc.left_school_at,
    coalesce(cc.left_school_by_name, '') as left_school_by_name,
    coalesce(cc.updated_at, now()) as updated_at,
    coalesce(cc.updated_by_name, '') as updated_by_name,
    true as is_active_student,
    true as is_active_membership,
    coalesce(amc.active_membership_count, 0) > 1 as has_multiple_active_memberships,
    sc.campus_id is null as needs_review,
    'sponte'::text as source_system,
    'sponte_raw_alunos_empresas'::text as source_table,
    s.aluno_id::text as source_id,
    s.import_batch_id as source_import_batch_id,
    s.raw_row_id,
    s.raw_payload_hash
  from active_students s
  left join student_class_choice sc
    on sc.aluno_id = s.aluno_id
  left join public.sponte_raw_turmas c
    on c.turma_id = sc.class_id
  left join active_membership_counts amc
    on amc.aluno_id = s.aluno_id
  left join active_guardians ag
    on ag.aluno_id = s.aluno_id
  left join current_checkout cc
    on cc.student_id = s.aluno_id
  order by s.full_name, s.aluno_id;
$$;

create or replace view public.checkout_active_students_view as
select * from public.checkout_active_students_snapshot();

grant select on public.checkout_class_campus_assignments to authenticated;
grant select on public.checkout_active_classes_view to authenticated;
grant select on public.checkout_active_guardians_view to authenticated;
grant select on public.checkout_active_students_view to authenticated;

grant select on public.checkout_class_campus_assignments to service_role;
grant select on public.checkout_active_classes_view to service_role;
grant select on public.checkout_active_guardians_view to service_role;
grant select on public.checkout_active_students_view to service_role;

commit;
