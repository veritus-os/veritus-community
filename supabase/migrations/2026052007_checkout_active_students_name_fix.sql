begin;

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
      coalesce(
        nullif(btrim(s.raw_payload ->> 'Nome'), ''),
        nullif(btrim(a.raw_payload ->> 'Nome'), ''),
        nullif(btrim(s.raw_payload ->> 'NomeSocial'), ''),
        nullif(btrim(a.raw_payload ->> 'NomeSocial'), ''),
        s.aluno_id::text
      ) as full_name,
      s.raw_payload ->> 'ResponsavelFinanceiroID' as financial_guardian_id,
      s.raw_payload ->> 'ResponsavelDidaticoID' as didactic_guardian_id
    from public.sponte_raw_alunos_empresas s
    left join public.sponte_raw_alunos a
      on a.aluno_id = s.aluno_id
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

commit;
