begin;

create or replace function public.current_app_access_type()
returns text
language sql
stable
as $$
  select lower(
    coalesce(
      auth.jwt() -> 'user_metadata' ->> 'access_type',
      auth.jwt() -> 'user_metadata' ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'access_type',
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    )
  );
$$;

create or replace function public.is_school_staff()
returns boolean
language sql
stable
as $$
  select public.current_app_access_type() in (
    'super_admin',
    'admin',
    'secretaria',
    'professor',
    'teacher',
    'cozinha',
    'financeiro',
    'administrador'
  );
$$;

create or replace function public.can_operate_student_checkout()
returns boolean
language sql
stable
as $$
  select public.current_app_access_type() in (
    'super_admin',
    'admin',
    'secretaria',
    'professor',
    'teacher',
    'administrador'
  );
$$;

create index if not exists idx_student_checkout_daily_campus_date_status
on public.student_checkout_daily(campus_name, checkout_date, status);

create index if not exists idx_student_checkout_logs_campus_date_created
on public.student_checkout_logs(campus_name, checkout_date, created_at desc);

drop policy if exists mvp_read_families on public.families;
create policy mvp_read_families on public.families for select to authenticated using (public.is_school_staff());

drop policy if exists mvp_read_students on public.students;
create policy mvp_read_students on public.students for select to authenticated using (public.is_school_staff());

drop policy if exists mvp_read_guardians on public.guardians;
create policy mvp_read_guardians on public.guardians for select to authenticated using (public.is_school_staff());

drop policy if exists mvp_read_profiles on public.profiles;
create policy mvp_read_profiles on public.profiles for select to authenticated using (public.is_school_staff());

drop policy if exists mvp_read_attendance on public.attendance;
create policy mvp_read_attendance on public.attendance for select to authenticated using (public.is_school_staff());

drop policy if exists mvp_manage_attendance on public.attendance;
drop policy if exists mvp_insert_attendance_staff on public.attendance;
drop policy if exists mvp_update_attendance_staff on public.attendance;
create policy mvp_insert_attendance_staff on public.attendance
for insert to authenticated
with check (public.can_operate_student_checkout());
create policy mvp_update_attendance_staff on public.attendance
for update to authenticated
using (public.can_operate_student_checkout())
with check (public.can_operate_student_checkout());

drop policy if exists mvp_read_activity_tags on public.activity_tags;
create policy mvp_read_activity_tags on public.activity_tags for select to authenticated using (public.is_school_staff());

drop policy if exists mvp_manage_activity_tags on public.activity_tags;
create policy mvp_manage_activity_tags on public.activity_tags
for all to authenticated
using (public.can_operate_student_checkout())
with check (public.can_operate_student_checkout());

drop policy if exists mvp_read_student_activity_tags on public.student_activity_tags;
create policy mvp_read_student_activity_tags on public.student_activity_tags for select to authenticated using (public.is_school_staff());

drop policy if exists mvp_manage_student_activity_tags on public.student_activity_tags;
create policy mvp_manage_student_activity_tags on public.student_activity_tags
for all to authenticated
using (public.can_operate_student_checkout())
with check (public.can_operate_student_checkout());

drop policy if exists mvp_read_student_checkout_daily on public.student_checkout_daily;
create policy mvp_read_student_checkout_daily on public.student_checkout_daily
for select to authenticated
using (public.can_operate_student_checkout());

drop policy if exists mvp_manage_student_checkout_daily on public.student_checkout_daily;
drop policy if exists mvp_insert_student_checkout_daily on public.student_checkout_daily;
drop policy if exists mvp_update_student_checkout_daily on public.student_checkout_daily;
create policy mvp_insert_student_checkout_daily on public.student_checkout_daily
for insert to authenticated
with check (
  public.can_operate_student_checkout()
  and updated_by_user_id = auth.uid()
  and coalesce(nullif(btrim(updated_by_name), ''), '') <> ''
);
create policy mvp_update_student_checkout_daily on public.student_checkout_daily
for update to authenticated
using (public.can_operate_student_checkout())
with check (
  public.can_operate_student_checkout()
  and updated_by_user_id = auth.uid()
  and coalesce(nullif(btrim(updated_by_name), ''), '') <> ''
);

drop policy if exists mvp_read_student_checkout_logs on public.student_checkout_logs;
create policy mvp_read_student_checkout_logs on public.student_checkout_logs
for select to authenticated
using (public.can_operate_student_checkout());

drop policy if exists mvp_insert_student_checkout_logs on public.student_checkout_logs;
create policy mvp_insert_student_checkout_logs on public.student_checkout_logs
for insert to authenticated
with check (
  public.can_operate_student_checkout()
  and changed_by_user_id = auth.uid()
  and coalesce(nullif(btrim(changed_by_name), ''), '') <> ''
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
END $$;

commit;
