-- 20260414_realtime_pickup_roles_and_finance.sql
-- Perfis, rastreio ETA em tempo real, contratos de alimentacao e financeiro com meios de pagamento.

begin;

create extension if not exists postgis with schema extensions;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_role_enum') THEN
    CREATE TYPE public.profile_role_enum AS ENUM ('parent', 'teacher', 'admin');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pickup_status_enum') THEN
    CREATE TYPE public.pickup_status_enum AS ENUM ('idle', 'en_route', 'at_gate');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_contract_type_enum') THEN
    CREATE TYPE public.meal_contract_type_enum AS ENUM ('almoço', 'lanche_manha', 'lanche_tarde');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_contract_plan_enum') THEN
    CREATE TYPE public.meal_contract_plan_enum AS ENUM ('diário', 'semanal', 'mensal');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_payment_method_enum') THEN
    CREATE TYPE public.invoice_payment_method_enum AS ENUM ('boleto', 'pix', 'card');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status_enum') THEN
    CREATE TYPE public.invoice_status_enum AS ENUM ('pending', 'paid', 'overdue');
  END IF;
END $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.profile_role_enum not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pickup_requests (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  guardian_id uuid references public.profiles(id) on delete set null,
  status public.pickup_status_enum not null default 'idle',
  current_eta interval,
  last_gps_location extensions.geography(point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pickup_requests_status_eta
on public.pickup_requests(status, current_eta);

create index if not exists idx_pickup_requests_location
on public.pickup_requests using gist(last_gps_location);

create table if not exists public.meal_contracts (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  type public.meal_contract_type_enum not null,
  plan public.meal_contract_plan_enum not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, type, plan)
);

create index if not exists idx_meal_contracts_student_active
on public.meal_contracts(student_id, active);

create table if not exists public.invoices (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  payment_method public.invoice_payment_method_enum not null,
  payment_status public.invoice_status_enum not null default 'pending',
  reference_month date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_status_method
on public.invoices(payment_status, payment_method);

create index if not exists idx_invoices_student_reference
on public.invoices(student_id, reference_month);

create or replace view public.portaria_live_eta as
select
  pr.id,
  pr.student_id,
  s.full_name as student_name,
  coalesce(s.class_name, 'Nao informada') as class_name,
  pr.guardian_id,
  pr.status,
  pr.current_eta,
  extract(epoch from coalesce(pr.current_eta, interval '0 second'))::int as eta_seconds,
  extensions.st_astext(pr.last_gps_location::extensions.geometry) as last_gps_wkt,
  pr.updated_at
from public.pickup_requests pr
join public.students s on s.id = pr.student_id
where pr.status in ('en_route', 'at_gate')
order by pr.current_eta asc nulls last, pr.updated_at desc;

create or replace view public.inadimplencia_dashboard as
select
  count(*) filter (where i.payment_status = 'overdue')::int as total_em_atraso,
  count(*) filter (where i.payment_status = 'pending')::int as total_pendente,
  count(*) filter (where i.payment_status = 'paid')::int as total_pago,
  coalesce(sum(i.amount) filter (where i.payment_status = 'overdue'), 0)::numeric(12,2) as valor_em_atraso,
  coalesce(sum(i.amount) filter (where i.payment_status = 'pending'), 0)::numeric(12,2) as valor_pendente,
  coalesce(sum(i.amount) filter (where i.payment_status = 'paid'), 0)::numeric(12,2) as valor_pago
from public.invoices i;

create or replace function public.update_parent_location(
  p_pickup_request_id bigint,
  p_lat double precision,
  p_lng double precision,
  p_eta_seconds integer default null
)
returns table (
  pickup_request_id bigint,
  distance_meters numeric,
  notified boolean,
  status public.pickup_status_enum,
  current_eta interval
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_school_location extensions.geography := st_setsrid(st_makepoint(-46.6745, -23.5632), 4326)::geography;
  v_parent_location extensions.geography := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_distance double precision;
  v_notify boolean := false;
  v_status public.pickup_status_enum;
  v_eta interval;
begin
  if p_lat is null or p_lng is null then
    raise exception 'Latitude e longitude sao obrigatorias.';
  end if;

  select st_distance(v_parent_location, v_school_location)
  into v_distance;

  update public.pickup_requests pr
  set
    last_gps_location = v_parent_location,
    current_eta = coalesce(
      make_interval(secs => greatest(coalesce(p_eta_seconds, 0), 0)),
      pr.current_eta
    ),
    status = case
      when v_distance < 500 then 'at_gate'::public.pickup_status_enum
      when pr.status = 'idle' then 'en_route'::public.pickup_status_enum
      else pr.status
    end,
    updated_at = now()
  where pr.id = p_pickup_request_id
    and (pr.guardian_id = auth.uid() or pr.guardian_id is null)
  returning pr.status, pr.current_eta
  into v_status, v_eta;

  if not found then
    raise exception 'Solicitacao de retirada nao encontrada ou sem permissao.';
  end if;

  if v_distance < 500 then
    v_notify := true;
    perform pg_notify(
      'pickup_eta_events',
      json_build_object(
        'pickup_request_id', p_pickup_request_id,
        'distance_meters', round(v_distance::numeric, 2),
        'status', v_status,
        'event', 'parent_near_gate'
      )::text
    );
  end if;

  return query
  select
    p_pickup_request_id,
    round(v_distance::numeric, 2),
    v_notify,
    v_status,
    v_eta;
end;
$$;

grant execute on function public.update_parent_location(bigint, double precision, double precision, integer) to authenticated;
grant select on public.portaria_live_eta to anon, authenticated;
grant select on public.inadimplencia_dashboard to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.pickup_requests enable row level security;
alter table public.meal_contracts enable row level security;
alter table public.invoices enable row level security;

drop policy if exists mvp_read_profiles on public.profiles;
create policy mvp_read_profiles on public.profiles for select to anon, authenticated using (true);

drop policy if exists mvp_read_pickup_requests on public.pickup_requests;
create policy mvp_read_pickup_requests on public.pickup_requests for select to anon, authenticated using (true);

drop policy if exists mvp_write_pickup_requests on public.pickup_requests;
create policy mvp_write_pickup_requests on public.pickup_requests for update to authenticated using (guardian_id = auth.uid() or guardian_id is null);

drop policy if exists mvp_read_meal_contracts on public.meal_contracts;
create policy mvp_read_meal_contracts on public.meal_contracts for select to anon, authenticated using (true);

drop policy if exists mvp_manage_meal_contracts on public.meal_contracts;
create policy mvp_manage_meal_contracts on public.meal_contracts for all to authenticated using (true) with check (true);

drop policy if exists mvp_read_invoices on public.invoices;
create policy mvp_read_invoices on public.invoices for select to anon, authenticated using (true);

drop policy if exists mvp_manage_invoices on public.invoices;
create policy mvp_manage_invoices on public.invoices for all to authenticated using (true) with check (true);

commit;
