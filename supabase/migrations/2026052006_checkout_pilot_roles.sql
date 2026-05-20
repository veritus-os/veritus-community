begin;

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
    'administrador',
    'reception',
    'infantil_coordination',
    'fundamental_coordination',
    'support'
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
    'administrador',
    'reception',
    'infantil_coordination',
    'fundamental_coordination',
    'support'
  );
$$;

commit;
